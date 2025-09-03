"""
Enhanced S3 service for document storage with progress tracking and error handling
"""
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from uuid import UUID
from pathlib import Path
from fastapi import UploadFile, HTTPException
from typing import Optional, Dict, Any
import io
import hashlib
import time
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Enhanced S3 service with progress tracking and robust error handling"""
    
    def __init__(self):
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=settings.aws_endpoint_url,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
            self.bucket_name = settings.s3_bucket_name
            # Store the external endpoint URL for presigned URLs
            self.external_endpoint_url = settings.aws_endpoint_url.replace('minio:9000', 'localhost:9000') if 'minio:9000' in settings.aws_endpoint_url else settings.aws_endpoint_url
            self._ensure_bucket_exists()
        except Exception as e:
            logger.error(f"Failed to initialize S3 service: {e}")
            raise RuntimeError(f"S3 service initialization failed: {e}")

    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if it doesn't"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 bucket '{self.bucket_name}' is accessible")
        except ClientError as e:
            error_code = int(e.response['Error']['Code'])
            if error_code == 404:
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created S3 bucket: {self.bucket_name}")
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    raise RuntimeError(f"Failed to create bucket: {create_error}")
            else:
                logger.error(f"Error accessing bucket: {e}")
                raise RuntimeError(f"Error accessing bucket: {e}")

    async def upload_document(
        self, 
        file: UploadFile, 
        document_id: UUID, 
        tenant_id: UUID,
        document_type: str = "document"
    ) -> Dict[str, Any]:
        """
        Upload document to S3 with comprehensive metadata and error handling
        
        Args:
            file: The uploaded file
            document_id: Unique document identifier
            tenant_id: Tenant identifier for organization
            document_type: Type of document for S3 organization
            
        Returns:
            Dictionary with upload metadata
        """
        start_time = time.time()
        
        try:
            # Generate S3 key with proper organization
            file_extension = Path(file.filename or "").suffix.lower()
            timestamp = int(time.time())
            s3_key = f"{tenant_id}/{document_type}s/{timestamp}_{document_id}{file_extension}"
            
            # Reset file pointer and read content
            await file.seek(0)
            file_content = await file.read()
            file_size = len(file_content)
            
            # Calculate file hash for integrity verification
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Validate file size
            if file_size > settings.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size ({file_size} bytes) exceeds maximum allowed size ({settings.max_file_size} bytes)"
                )
            
            if file_size == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot upload empty file"
                )
            
            # Prepare metadata
            metadata = {
                'original_filename': file.filename or 'unknown',
                'tenant_id': str(tenant_id),
                'document_id': str(document_id),
                'upload_timestamp': str(timestamp),
                'file_hash': file_hash,
                'file_size': str(file_size),
                'document_type': document_type
            }
            
            # Upload to S3 with metadata
            self.s3_client.upload_fileobj(
                io.BytesIO(file_content),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': file.content_type or 'application/octet-stream',
                    'Metadata': metadata
                    # Note: ServerSideEncryption removed for MinIO compatibility
                }
            )
            
            upload_time = time.time() - start_time
            logger.info(f"Successfully uploaded {s3_key} ({file_size} bytes) in {upload_time:.2f}s")
            
            return {
                "s3_key": s3_key,
                "file_size": file_size,
                "content_type": file.content_type,
                "file_hash": file_hash,
                "upload_time": upload_time,
                "metadata": metadata
            }
            
        except HTTPException:
            raise
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload document to storage: {e}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during upload: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error during upload: {e}"
            )

    async def upload_thumbnail(
        self,
        thumbnail_data: bytes,
        document_id: UUID,
        tenant_id: UUID,
        image_format: str = "jpg"
    ) -> str:
        """
        Upload thumbnail image for a document
        
        Args:
            thumbnail_data: Thumbnail image bytes
            document_id: Document identifier
            tenant_id: Tenant identifier
            image_format: Image format (jpg, png, etc.)
            
        Returns:
            S3 key for the thumbnail
        """
        try:
            timestamp = int(time.time())
            thumbnail_key = f"{tenant_id}/thumbnails/{timestamp}_{document_id}.{image_format}"
            
            self.s3_client.upload_fileobj(
                io.BytesIO(thumbnail_data),
                self.bucket_name,
                thumbnail_key,
                ExtraArgs={
                    'ContentType': f'image/{image_format}',
                    'Metadata': {
                        'document_id': str(document_id),
                        'tenant_id': str(tenant_id),
                        'type': 'thumbnail',
                        'created_at': str(timestamp)
                    }
                    # Note: ServerSideEncryption removed for MinIO compatibility
                }
            )
            
            logger.info(f"Uploaded thumbnail: {thumbnail_key}")
            return thumbnail_key
            
        except ClientError as e:
            logger.error(f"Thumbnail upload failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload thumbnail: {e}"
            )

    async def get_download_url(
        self, 
        s3_key: str, 
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """
        Generate presigned URL for secure document download
        
        Args:
            s3_key: S3 object key
            expires_in: URL expiration time in seconds
            filename: Optional filename for download
            
        Returns:
            Presigned download URL
        """
        try:
            params = {'Bucket': self.bucket_name, 'Key': s3_key}
            
            # Add content disposition for custom filename
            if filename:
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            # Replace internal Docker hostname with localhost for external access
            if 'minio:9000' in url:
                url = url.replace('minio:9000', 'localhost:9000')
            
            logger.debug(f"Generated download URL for {s3_key}, expires in {expires_in}s")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate download URL: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate download URL: {e}"
            )

    async def get_external_download_url(
        self, 
        s3_key: str, 
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """
        Generate presigned URL for external access (frontend)
        
        Args:
            s3_key: S3 object key
            expires_in: URL expiration time in seconds
            filename: Optional filename for download
            
        Returns:
            Presigned download URL with external hostname
        """
        try:
            # Create a separate client with external endpoint for presigned URLs
            external_client = boto3.client(
                's3',
                endpoint_url=self.external_endpoint_url,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
            
            params = {'Bucket': self.bucket_name, 'Key': s3_key}
            
            # Add content disposition for custom filename
            if filename:
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            url = external_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            logger.debug(f"Generated external download URL for {s3_key}, expires in {expires_in}s")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate external download URL: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate external download URL: {e}"
            )

    async def get_document_content(self, s3_key: str) -> bytes:
        """
        Retrieve document content from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Document content as bytes
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name, 
                Key=s3_key
            )
            content = response['Body'].read()
            logger.debug(f"Retrieved {len(content)} bytes from {s3_key}")
            return content
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"Document not found: {s3_key}")
                raise HTTPException(
                    status_code=404,
                    detail=f"Document not found: {s3_key}"
                )
            logger.error(f"Failed to retrieve document: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve document: {e}"
            )

    async def delete_document(self, s3_key: str) -> bool:
        """
        Delete document from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name, 
                Key=s3_key
            )
            logger.info(f"Deleted document: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete {s3_key}: {e}")
            return False

    async def delete_document_and_thumbnail(
        self, 
        document_s3_key: str, 
        thumbnail_s3_key: Optional[str] = None
    ) -> Dict[str, bool]:
        """
        Delete both document and its thumbnail
        
        Args:
            document_s3_key: Document S3 key
            thumbnail_s3_key: Optional thumbnail S3 key
            
        Returns:
            Dictionary with deletion results
        """
        results = {}
        
        # Delete main document
        results['document'] = await self.delete_document(document_s3_key)
        
        # Delete thumbnail if exists
        if thumbnail_s3_key:
            results['thumbnail'] = await self.delete_document(thumbnail_s3_key)
        else:
            results['thumbnail'] = True  # No thumbnail to delete
            
        return results

    async def verify_file_integrity(
        self, 
        s3_key: str, 
        expected_hash: str
    ) -> bool:
        """
        Verify file integrity by comparing hashes
        
        Args:
            s3_key: S3 object key
            expected_hash: Expected SHA256 hash
            
        Returns:
            True if hashes match, False otherwise
        """
        try:
            content = await self.get_document_content(s3_key)
            actual_hash = hashlib.sha256(content).hexdigest()
            
            is_valid = actual_hash == expected_hash
            if not is_valid:
                logger.warning(f"Hash mismatch for {s3_key}: expected {expected_hash}, got {actual_hash}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Integrity verification failed for {s3_key}: {e}")
            return False

    async def get_object_metadata(self, s3_key: str) -> Dict[str, Any]:
        """
        Get object metadata from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Object metadata dictionary
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'content_length': response.get('ContentLength'),
                'content_type': response.get('ContentType'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag', '').strip('"'),
                'metadata': response.get('Metadata', {}),
                'server_side_encryption': response.get('ServerSideEncryption')
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="Object not found")
            raise HTTPException(status_code=500, detail=f"Failed to get metadata: {e}")

    def get_upload_progress_callback(self, total_size: int):
        """
        Create a progress callback for upload tracking
        
        Args:
            total_size: Total file size in bytes
            
        Returns:
            Progress callback function
        """
        uploaded = [0]  # Use list for mutable reference
        
        def progress_callback(bytes_transferred: int):
            uploaded[0] += bytes_transferred
            percentage = (uploaded[0] / total_size) * 100
            logger.debug(f"Upload progress: {percentage:.1f}% ({uploaded[0]}/{total_size} bytes)")
            
        return progress_callback


# Global S3 service instance
s3_service = S3Service()
