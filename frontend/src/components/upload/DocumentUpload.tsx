/**
 * Enhanced drag-and-drop document upload component with document type selection
 */
import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { apiClient, DocumentUploadResponse, Category } from '../../services/api';

const UploadContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const UploadCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 2rem;
  box-shadow: ${props => props.theme.shadows.md};
  border: 1px solid ${props => props.theme.colors.border};
`;

const UploadTitle = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const UploadSubtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 2rem;
`;

interface DropZoneProps {
  isDragActive: boolean;
  hasError: boolean;
}

const DropZone = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isDragActive', 'hasError'].includes(prop),
})<DropZoneProps>`
  border: 2px dashed ${props => 
    props.hasError ? props.theme.colors.error :
    props.isDragActive ? props.theme.colors.primary : 
    props.theme.colors.border
  };
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  background: ${props => 
    props.hasError ? `${props.theme.colors.error}15` :
    props.isDragActive ? `${props.theme.colors.primary}15` : 
    props.theme.colors.background
  };
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 2rem;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => `${props.theme.colors.primary}15`};
  }
`;

const DropZoneIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const DropZoneText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
`;

const DropZoneSubText = styled.p`
  color: ${props => props.theme.colors.text.muted};
  font-size: 0.9rem;
`;

const FileInput = styled.input`
  display: none;
`;



const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 1rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}30;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-size: 1rem;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}30;
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const UploadButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'disabled',
})<{ disabled?: boolean }>`
  background: ${props => props.disabled ? props.theme.colors.neutral : props.theme.colors.primary};
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primaryHover};
  }
`;

const ProgressSection = styled.div`
  margin-top: 2rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'progress',
})<{ progress: number }>`
  height: 100%;
  background: ${props => props.theme.colors.primary};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  text-align: center;
`;

const Message = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'type',
})<{ type: 'success' | 'error' }>`
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  
  ${props => props.type === 'success' ? `
    background: ${props.theme.colors.success}15;
    color: ${props.theme.colors.success};
    border: 1px solid ${props.theme.colors.success}30;
  ` : `
    background: ${props.theme.colors.error}15;
    color: ${props.theme.colors.error};
    border: 1px solid ${props.theme.colors.error}30;
  `}
`;

const FileInfo = styled.div`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 2rem;
`;

const FileName = styled.h4`
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const FileDetails = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  margin: 0;
`;

interface DocumentUploadProps {
  categories?: Category[];
  onUploadSuccess?: (result: DocumentUploadResponse) => void;
  onUploadError?: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  categories = [],
  onUploadSuccess,
  onUploadError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponse | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);



  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, DOCX, DOC, and TXT files are allowed.';
    }

    // 20MB limit (as per user requirement, not the 50MB from plan)
    if (file.size > 20 * 1024 * 1024) {
      return 'File size must be less than 20MB.';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
    setUploadResult(null);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const result = await apiClient.uploadDocument(selectedFile, {
        category_id: selectedCategory || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        onUploadProgress: setUploadProgress
      });

      setUploadResult(result);
      
      // Reset all form fields
      setSelectedFile(null);
      setSelectedCategory('');
      setTags('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    return apiClient.formatFileSize(bytes);
  };

  return (
    <UploadContainer>
      <UploadCard>
        <UploadTitle>Upload Document</UploadTitle>
        <UploadSubtitle>
          Drag and drop your document or click to browse. Supported formats: PDF, DOCX, DOC, TXT (max 20MB)
        </UploadSubtitle>

        <DropZone
          isDragActive={isDragActive}
          hasError={!!error}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <DropZoneIcon>
            {isDragActive ? '⬇️' : error ? '❌' : '📄'}
          </DropZoneIcon>
          <DropZoneText>
            {isDragActive
              ? 'Drop your file here'
              : error
              ? 'Invalid file type or size'
              : 'Drag and drop your document here'
            }
          </DropZoneText>
          <DropZoneSubText>
            or click to browse your files
          </DropZoneSubText>
        </DropZone>

        <FileInput
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInputChange}
        />

        {selectedFile && (
          <FileInfo>
            <FileName>{selectedFile.name}</FileName>
            <FileDetails>
              {formatFileSize(selectedFile.size)} • {selectedFile.type}
            </FileDetails>
          </FileInfo>
        )}

        <FormGroup style={{ marginBottom: '1.5rem' }}>
          <Label htmlFor="category">Category (Optional)</Label>
          <Select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isUploading}
          >
            <option value="">Select a category...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup style={{ marginBottom: '2rem' }}>
          <Label htmlFor="tags">Tags (Optional)</Label>
          <Input
            id="tags"
            type="text"
            placeholder="invoice, billing, contract (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={isUploading}
          />
        </FormGroup>

        <UploadButton
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </UploadButton>

        {isUploading && (
          <ProgressSection>
            <ProgressBar>
              <ProgressFill progress={uploadProgress} />
            </ProgressBar>
            <ProgressText>
              Uploading: {uploadProgress}%
            </ProgressText>
          </ProgressSection>
        )}

        {uploadResult && (
          <Message type="success">
            <strong>✅ Upload Successful!</strong>
            <br />
            Document has been uploaded successfully. Text extraction is processing in the background.
          </Message>
        )}

        {error && (
          <Message type="error">
            <strong>❌ Upload Failed</strong>
            <br />
            {error}
          </Message>
        )}
      </UploadCard>
    </UploadContainer>
  );
};

export default DocumentUpload;