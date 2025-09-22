/**
 * Document Category Types
 */
import { BaseEntity } from '../../base/types/common';

// Core Category Types
export interface Category extends BaseEntity {
  tenant_id: string;
  name: string;
  description?: string;
  color: string;
  document_count: number;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface CategoryListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_stats?: boolean;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Category Documents
export interface CategoryDocument {
  id: string;
  original_filename: string;
  file_size: number;
  status: string;
  extraction_status: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryDocumentsResponse {
  category: {
    id: string;
    name: string;
    color: string;
  };
  documents: CategoryDocument[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Category Statistics
export interface CategoryUsageStats {
  category_stats: Array<{
    name: string;
    color: string;
    document_count: number;
    total_size: number;
    percentage: number;
  }>;
  total_categories: number;
  total_documents: number;
  uncategorized_count: number;
  uncategorized_percentage: number;
}

export interface CategoryStats {
  id: string;
  name: string;
  color: string;
  document_count: number;
  total_size_bytes: number;
  avg_file_size: number;
  oldest_document: string;
  newest_document: string;
  extraction_success_rate: number;
  most_common_document_type: string;
}

// Category Validation
export interface CategoryValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Category Search
export interface CategorySearchResult {
  categories: Category[];
  total: number;
  search_query: string;
  filters_applied: string[];
}

// Category Colors
export interface CategoryColor {
  name: string;
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  is_default: boolean;
}

export interface CategoryColorPalette {
  colors: CategoryColor[];
  default_color: string;
}

// Category Bulk Operations
export interface CategoryBulkUpdateRequest {
  category_ids: string[];
  updates: CategoryUpdateRequest;
}

export interface CategoryBulkDeleteRequest {
  category_ids: string[];
  force?: boolean;
  move_documents_to?: string; // Category ID to move documents to
}

export interface CategoryBulkOperationResponse {
  success_count: number;
  failure_count: number;
  errors: Array<{
    category_id: string;
    error: string;
  }>;
  warnings: Array<{
    category_id: string;
    warning: string;
  }>;
}

// Category Templates
export interface CategoryTemplate {
  id: string;
  category_id: string;
  template_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryTemplateAssignment {
  category_id: string;
  template_id: string;
  is_default?: boolean;
}

// Category Permissions
export interface CategoryPermissions {
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_assign_templates: boolean;
  can_view_stats: boolean;
  can_manage_colors: boolean;
}

// Category Status Types
export type CategoryStatus = 'active' | 'inactive' | 'archived';

// Category Sort Options
export type CategorySortBy = 'name' | 'document_count' | 'created_at' | 'updated_at';

export type CategorySortOrder = 'asc' | 'desc';

// Default Category Colors
export const DEFAULT_CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// Category Validation Rules
export const CATEGORY_VALIDATION_RULES = {
  name: {
    min_length: 1,
    max_length: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  description: {
    max_length: 500,
  },
  color: {
    pattern: /^#[0-9A-Fa-f]{6}$/,
  },
};
