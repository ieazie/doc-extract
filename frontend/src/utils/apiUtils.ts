/**
 * API Utility Functions
 * 
 * @deprecated Use services/api/utils as the single source of truth.
 * This file re-exports the canonical implementations to maintain backward compatibility.
 */

// Re-export from the canonical source to avoid duplication and bugs
export { formatFileSize, formatDate } from '../services/api/utils';
