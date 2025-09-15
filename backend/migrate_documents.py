#!/usr/bin/env python3
"""
Migration script to move documents and thumbnails from the old 'documents' bucket
to the new tenant-specific 'default-tenant-development' bucket.
"""
import sys
import os
sys.path.append('/app/src')

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from uuid import UUID
import boto3
from botocore.exceptions import ClientError
import logging

# Database connection
DATABASE_URL = "postgresql://postgres:password@db:5432/docextract"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_s3_client():
    """Get S3 client for MinIO"""
    return boto3.client(
        's3',
        endpoint_url='http://minio:9000',
        aws_access_key_id='minioadmin',
        aws_secret_access_key='minioadmin',
        region_name='us-east-1'
    )

def migrate_documents():
    """Migrate all documents and thumbnails to tenant-specific bucket"""
    logger.info("🚀 Starting document migration...")
    
    # Get database session
    db = SessionLocal()
    s3_client = get_s3_client()
    
    try:
        # Get the default tenant
        from src.models.database import Tenant
        tenant = db.query(Tenant).filter(Tenant.name == "Default Tenant").first()
        
        if not tenant:
            logger.error("❌ No default tenant found")
            return
        
        logger.info(f"✅ Found tenant: {tenant.name} (ID: {tenant.id})")
        logger.info(f"✅ Tenant slug: {tenant.slug}")
        
        # Source and destination buckets
        source_bucket = 'documents'
        dest_bucket = f"{tenant.slug}-development"
        
        logger.info(f"📦 Source bucket: {source_bucket}")
        logger.info(f"📦 Destination bucket: {dest_bucket}")
        
        # Ensure destination bucket exists
        try:
            s3_client.head_bucket(Bucket=dest_bucket)
            logger.info(f"✅ Destination bucket '{dest_bucket}' exists")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                s3_client.create_bucket(Bucket=dest_bucket)
                logger.info(f"✅ Created destination bucket '{dest_bucket}'")
            else:
                logger.error(f"❌ Error checking destination bucket: {e}")
                return
        
        # Migrate documents
        logger.info("\n📄 Migrating documents...")
        documents_migrated = 0
        documents_failed = 0
        
        try:
            # List all documents in the old bucket
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=source_bucket, Prefix=f"{tenant.id}/documents/")
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        source_key = obj['Key']
                        dest_key = source_key  # Keep the same key structure
                        
                        try:
                            # Copy object to destination bucket
                            copy_source = {'Bucket': source_bucket, 'Key': source_key}
                            s3_client.copy_object(CopySource=copy_source, Bucket=dest_bucket, Key=dest_key)
                            
                            documents_migrated += 1
                            if documents_migrated % 10 == 0:
                                logger.info(f"   Migrated {documents_migrated} documents...")
                                
                        except Exception as e:
                            logger.error(f"❌ Failed to migrate document {source_key}: {e}")
                            documents_failed += 1
            
            logger.info(f"✅ Documents migration complete: {documents_migrated} migrated, {documents_failed} failed")
            
        except Exception as e:
            logger.error(f"❌ Error during documents migration: {e}")
        
        # Migrate thumbnails
        logger.info("\n🖼️  Migrating thumbnails...")
        thumbnails_migrated = 0
        thumbnails_failed = 0
        
        try:
            # List all thumbnails in the old bucket
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=source_bucket, Prefix=f"{tenant.id}/thumbnails/")
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        source_key = obj['Key']
                        dest_key = source_key  # Keep the same key structure
                        
                        try:
                            # Copy object to destination bucket
                            copy_source = {'Bucket': source_bucket, 'Key': source_key}
                            s3_client.copy_object(CopySource=copy_source, Bucket=dest_bucket, Key=dest_key)
                            
                            thumbnails_migrated += 1
                            if thumbnails_migrated % 10 == 0:
                                logger.info(f"   Migrated {thumbnails_migrated} thumbnails...")
                                
                        except Exception as e:
                            logger.error(f"❌ Failed to migrate thumbnail {source_key}: {e}")
                            thumbnails_failed += 1
            
            logger.info(f"✅ Thumbnails migration complete: {thumbnails_migrated} migrated, {thumbnails_failed} failed")
            
        except Exception as e:
            logger.error(f"❌ Error during thumbnails migration: {e}")
        
        # Verify migration
        logger.info("\n🔍 Verifying migration...")
        
        try:
            # Count files in destination bucket
            dest_docs = s3_client.list_objects_v2(Bucket=dest_bucket, Prefix=f"{tenant.id}/documents/")
            dest_thumbnails = s3_client.list_objects_v2(Bucket=dest_bucket, Prefix=f"{tenant.id}/thumbnails/")
            
            dest_doc_count = len(dest_docs.get('Contents', []))
            dest_thumb_count = len(dest_thumbnails.get('Contents', []))
            
            logger.info(f"📊 Destination bucket verification:")
            logger.info(f"   Documents: {dest_doc_count}")
            logger.info(f"   Thumbnails: {dest_thumb_count}")
            
        except Exception as e:
            logger.error(f"❌ Error verifying migration: {e}")
        
        logger.info(f"\n🎉 Migration completed!")
        logger.info(f"   📄 Documents: {documents_migrated} migrated")
        logger.info(f"   🖼️  Thumbnails: {thumbnails_migrated} migrated")
        logger.info(f"   ❌ Failed: {documents_failed + thumbnails_failed} total")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

def verify_migration():
    """Verify that migration was successful"""
    logger.info("\n🔍 Verifying migration results...")
    
    s3_client = get_s3_client()
    
    try:
        # Check source bucket
        source_docs = s3_client.list_objects_v2(Bucket='documents', Prefix='00000000-0000-0000-0000-000000000001/documents/')
        source_thumbnails = s3_client.list_objects_v2(Bucket='documents', Prefix='00000000-0000-0000-0000-000000000001/thumbnails/')
        
        source_doc_count = len(source_docs.get('Contents', []))
        source_thumb_count = len(source_thumbnails.get('Contents', []))
        
        # Check destination bucket
        dest_docs = s3_client.list_objects_v2(Bucket='default-tenant-development', Prefix='00000000-0000-0000-0000-000000000001/documents/')
        dest_thumbnails = s3_client.list_objects_v2(Bucket='default-tenant-development', Prefix='00000000-0000-0000-0000-000000000001/thumbnails/')
        
        dest_doc_count = len(dest_docs.get('Contents', []))
        dest_thumb_count = len(dest_thumbnails.get('Contents', []))
        
        logger.info(f"📊 Migration Verification:")
        logger.info(f"   Source bucket (documents):")
        logger.info(f"     Documents: {source_doc_count}")
        logger.info(f"     Thumbnails: {source_thumb_count}")
        logger.info(f"   Destination bucket (default-tenant-development):")
        logger.info(f"     Documents: {dest_doc_count}")
        logger.info(f"     Thumbnails: {dest_thumb_count}")
        
        if dest_doc_count >= source_doc_count and dest_thumb_count >= source_thumb_count:
            logger.info("✅ Migration verification successful!")
            return True
        else:
            logger.warning("⚠️  Migration verification shows missing files")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error during verification: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate documents to tenant-specific bucket')
    parser.add_argument('--verify-only', action='store_true', help='Only verify migration, do not migrate')
    
    args = parser.parse_args()
    
    if args.verify_only:
        verify_migration()
    else:
        migrate_documents()
        verify_migration()
