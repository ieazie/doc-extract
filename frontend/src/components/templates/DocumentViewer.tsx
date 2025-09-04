/**
 * Document Viewer Component
 * PDF.js-based viewer for full document rendering with multi-page support
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Maximize2
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Types
interface Document {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  upload_date: string;
  file?: File;
}

interface DocumentViewerProps {
  document: Document;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
}

// Styled Components
const ViewerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
`;

const ViewerHeader = styled.div`
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PageButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  min-width: 80px;
  text-align: center;
`;

const ZoomControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ZoomButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

const ZoomLevel = styled.span`
  font-size: 0.875rem;
  color: #374151;
  min-width: 60px;
  text-align: center;
`;

const ViewerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

const DocumentCanvas = styled.div`
  flex: 1;
  overflow: auto;
  background: #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
`;

const CanvasContainer = styled.div`
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
`;

const Canvas = styled.canvas`
  display: block;
  max-width: 100%;
  height: auto;
`;

const TextContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  max-height: 80vh;
  overflow-y: auto;
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
`;

const LoadingText = styled.div`
  color: #6b7280;
  font-size: 1rem;
`;

const ErrorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  padding: 2rem;
`;

const ErrorIcon = styled.div`
  width: 4rem;
  height: 4rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  font-size: 1.5rem;
`;

const ErrorText = styled.div`
  color: #dc2626;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const ErrorSubtext = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
`;

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onPageChange,
  onZoomChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [textContent, setTextContent] = useState<string>('');

  // Load PDF document
  useEffect(() => {
    if (!document) return;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading document:', document.filename);
        
        if (document.file && document.content_type.includes('pdf')) {
          // Use the actual uploaded file
          const fileUrl = URL.createObjectURL(document.file);
          
          // Load PDF document
          const pdf = await pdfjsLib.getDocument(fileUrl).promise;
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setIsLoading(false);
          
          // Clean up URL
          URL.revokeObjectURL(fileUrl);
        } else if (document.file && (document.content_type.includes('text') || document.content_type.includes('document'))) {
          // Handle text files
          const text = await document.file.text();
          setTextContent(text);
          setTotalPages(1);
          setIsLoading(false);
        } else {
          // For unsupported files, show a placeholder
          setTotalPages(1);
          setIsLoading(false);
        }
        
      } catch (err) {
        setError('Failed to load document');
        setIsLoading(false);
        console.error('Document loading error:', err);
      }
    };

    loadPDF();
  }, [document]);

  // Render current page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        console.log(`Rendering page ${currentPage} at zoom ${zoom}`);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get the page
        const page = await pdfDocument.getPage(currentPage);
        
        // Calculate scale based on zoom
        const scale = zoom;
        const viewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render the page
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
      } catch (err) {
        console.error('Page rendering error:', err);
        // Fallback to mock rendering if PDF rendering fails
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.fillText('Error rendering PDF. Please try again.', 50, 50);
          }
        }
      }
    };

    renderPage();
  }, [currentPage, zoom, pdfDocument, totalPages]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 3.0);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleDownload = () => {
    // TODO: Implement document download
    console.log('Downloading document:', document.filename);
  };

  const handleRotate = () => {
    // TODO: Implement document rotation
    console.log('Rotating document');
  };

  const handleFullscreen = () => {
    // TODO: Implement fullscreen mode
    console.log('Entering fullscreen mode');
  };

  if (isLoading) {
    return (
      <ViewerContainer>
        <LoadingContainer>
          <LoadingText>Loading document...</LoadingText>
        </LoadingContainer>
      </ViewerContainer>
    );
  }

  if (error) {
    return (
      <ViewerContainer>
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorText>Failed to load document</ErrorText>
          <ErrorSubtext>{error}</ErrorSubtext>
        </ErrorContainer>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer>
      <ViewerHeader>
        <PageControls>
          <PageButton 
            onClick={handlePreviousPage} 
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={16} />
          </PageButton>
          
          <PageInfo>
            {currentPage} / {totalPages}
          </PageInfo>
          
          <PageButton 
            onClick={handleNextPage} 
            disabled={currentPage >= totalPages}
          >
            <ChevronRight size={16} />
          </PageButton>
        </PageControls>

        <ZoomControls>
          <ZoomButton onClick={handleZoomOut}>
            <ZoomOut size={16} />
          </ZoomButton>
          
          <ZoomLevel>{Math.round(zoom * 100)}%</ZoomLevel>
          
          <ZoomButton onClick={handleZoomIn}>
            <ZoomIn size={16} />
          </ZoomButton>
        </ZoomControls>

        <ViewerActions>
          <ActionButton onClick={handleRotate}>
            <RotateCw size={16} />
            Rotate
          </ActionButton>
          
          <ActionButton onClick={handleFullscreen}>
            <Maximize2 size={16} />
            Fullscreen
          </ActionButton>
          
          <ActionButton onClick={handleDownload}>
            <Download size={16} />
            Download
          </ActionButton>
        </ViewerActions>
      </ViewerHeader>

      <DocumentCanvas>
        {pdfDocument ? (
          <CanvasContainer>
            <Canvas
              ref={canvasRef}
              width={800}
              height={1000}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            />
          </CanvasContainer>
        ) : textContent ? (
          <TextContent style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            {textContent}
          </TextContent>
        ) : (
          <CanvasContainer>
            <Canvas
              ref={canvasRef}
              width={800}
              height={1000}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            />
          </CanvasContainer>
        )}
      </DocumentCanvas>
    </ViewerContainer>
  );
};

export default DocumentViewer;
