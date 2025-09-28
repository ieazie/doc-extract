/**
 * Document Viewer Component
 * PDF.js-based viewer for full document rendering with multi-page support
 */
import React, { useEffect, useRef, useState } from 'react';
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
import {
  ViewerContainer,
  ViewerHeader,
  PageControls,
  PageButton,
  PageInfo,
  ZoomControls,
  ZoomButton,
  ZoomLevel,
  ViewerActions,
  ActionButton,
  DocumentCanvas,
  CanvasContainer,
  CanvasWrapper,
  Canvas,
  TextContent,
  LoadingContainer,
  LoadingText,
  ErrorContainer,
  ErrorIcon,
  ErrorText,
  ErrorSubtext
} from './DocumentViewer.styled';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Types
import { Document as ApiDocument } from '../../services/api/index';

interface Document extends ApiDocument {
  file?: File;
}

interface DocumentViewerProps {
  document: Document;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
}

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
  const [renderKey, setRenderKey] = useState(0);

  // Refs for render management
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef<boolean>(false);

  // Load PDF document
  const loadPDF = async () => {
    if (!document.file) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading document:', document.original_filename);
      console.log('Document object:', document);
      console.log('Document file:', document.file);
      console.log('Document mime_type:', document.mime_type);

      const arrayBuffer = await document.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF document');
      setIsLoading(false);
    }
  };

  // Load document on mount
  useEffect(() => {
    loadPDF();
  }, [document]);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 3.0);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
    setRenderKey(prev => prev + 1); // Force re-render
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.25);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
    setRenderKey(prev => prev + 1); // Force re-render
  };

  // Page navigation
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

  // Other controls
  const handleRotate = () => {
    // TODO: Implement rotation
    console.log('Rotate clicked');
  };

  const handleFullscreen = () => {
    // TODO: Implement fullscreen
    console.log('Fullscreen clicked');
  };

  const handleDownload = () => {
    if (document.file) {
      const url = URL.createObjectURL(document.file);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Render PDF page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) {
      console.log('Render effect triggered - pdfDocument:', !!pdfDocument, 'canvasRef:', !!canvasRef.current);
      if (!pdfDocument || !canvasRef.current) {
        console.log('Missing pdfDocument or canvasRef, skipping render');
        return;
      }
    }

    const renderCurrentPage = async () => {
      // Prevent concurrent renders
      if (isRenderingRef.current) {
        console.log('Render already in progress, skipping');
        return;
      }

      try {
        console.log(`Starting render: page ${currentPage}, zoom ${zoom}, renderKey ${renderKey}`);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Mark as rendering
        isRenderingRef.current = true;

        // Cancel any existing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        const scale = zoom;
        
        // Get the current page
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        const scaledWidth = viewport.width * devicePixelRatio;
        const scaledHeight = viewport.height * devicePixelRatio;
        
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Reset transform and set scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
        
        // Render the page
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        
        // Mark as complete
        isRenderingRef.current = false;
        
        console.log(`Successfully rendered page ${currentPage}`);
        
      } catch (err) {
        console.error('Page rendering error:', err);
        
        // Clear references
        renderTaskRef.current = null;
        isRenderingRef.current = false;
        
        // Only set error for non-cancellation errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (!errorMessage.includes('cancelled') && !errorMessage.includes('canvas')) {
          setError('Failed to render PDF pages');
        }
      }
    };

    renderCurrentPage();
  }, [currentPage, zoom, pdfDocument, renderKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, []);

  return (
    <ViewerContainer>
      <ViewerHeader>
        <PageControls>
          <PageButton onClick={handlePreviousPage} disabled={currentPage <= 1}>
            <ChevronLeft size={16} />
          </PageButton>
          
          <PageInfo>
            {currentPage} of {totalPages}
          </PageInfo>
          
          <PageButton onClick={handleNextPage} disabled={currentPage >= totalPages}>
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
        {isLoading ? (
          <LoadingContainer>
            <LoadingText>Loading document...</LoadingText>
          </LoadingContainer>
        ) : error ? (
          <ErrorContainer>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorText>Error loading document</ErrorText>
            <ErrorSubtext>{error}</ErrorSubtext>
          </ErrorContainer>
        ) : textContent ? (
          <TextContent style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            {textContent}
          </TextContent>
        ) : pdfDocument ? (
          <CanvasContainer>
            <Canvas
              key={renderKey} // Force container recreation when renderKey changes
              ref={canvasRef}
            />
          </CanvasContainer>
        ) : (
          <ErrorContainer>
            <ErrorIcon>📄</ErrorIcon>
            <ErrorText>Unsupported file type</ErrorText>
            <ErrorSubtext>This file type cannot be previewed</ErrorSubtext>
          </ErrorContainer>
        )}
      </DocumentCanvas>
    </ViewerContainer>
  );
};

export default DocumentViewer;