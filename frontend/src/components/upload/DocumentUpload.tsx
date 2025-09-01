/**
 * Simple document upload component
 */
import React, { useState, useRef } from 'react';
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

const FileInput = styled.input`
  margin-bottom: 2rem;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  width: 100%;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
`;

const UploadButton = styled.button<{ disabled?: boolean }>`
  background: ${props => props.disabled ? props.theme.colors.neutral : props.theme.colors.primary};
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primaryHover};
  }
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.border};
  border-radius: 4px;
  margin: 1rem 0;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background: ${props => props.theme.colors.primary};
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;

const Message = styled.div<{ type: 'success' | 'error' }>`
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
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponse | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (file.size > 20 * 1024 * 1024) {
      return 'File size must be less than 20MB.';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      setError('');
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

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

  return (
    <UploadContainer>
      <UploadCard>
        <UploadTitle>Upload Document</UploadTitle>
        <UploadSubtitle>
          Select a document to upload and extract structured data. Supported formats: PDF, DOCX, DOC, TXT
        </UploadSubtitle>

        <FileInput
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange}
        />

        <FormGroup>
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

        <FormGroup>
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
          <ProgressBar progress={uploadProgress} />
        )}

        {uploadResult && (
          <Message type="success">
            <strong>✅ Upload Successful!</strong><br />
            Document has been uploaded successfully. Text extraction is processing in the background.
          </Message>
        )}

        {error && (
          <Message type="error">
            <strong>❌ Upload Failed</strong><br />
            {error}
          </Message>
        )}
      </UploadCard>
    </UploadContainer>
  );
};

export default DocumentUpload;