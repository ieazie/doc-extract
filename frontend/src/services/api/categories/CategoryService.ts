/**
 * Document Category Service
 * Handles all category-related operations including CRUD, statistics, and document management
 */
import { AxiosInstance } from 'axios';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryListParams,
  CategoryListResponse,
  CategoryDocumentsResponse,
  CategoryUsageStats,
  CategoryStats,
  CategoryValidationResult,
  CategorySearchResult,
  CategoryColorPalette,
  CategoryBulkUpdateRequest,
  CategoryBulkDeleteRequest,
  CategoryBulkOperationResponse,
  CategoryTemplate,
  CategoryTemplateAssignment,
  CategoryPermissions,
  DEFAULT_CATEGORY_COLORS
} from './types/categories';

export class CategoryService extends BaseApiClient {
  constructor(client: AxiosInstance) {
    super(client);
  }

  // Category CRUD Operations
  async getCategories(params?: CategoryListParams): Promise<CategoryListResponse> {
    return this.get<CategoryListResponse>('/api/categories', params);
  }

  async getCategory(categoryId: string): Promise<Category> {
    return this.get<Category>(`/api/categories/${categoryId}`);
  }

  async createCategory(categoryData: CategoryCreateRequest): Promise<Category> {
    return this.post<Category>('/api/categories', categoryData);
  }

  async updateCategory(categoryId: string, categoryData: CategoryUpdateRequest): Promise<Category> {
    return this.put<Category>(`/api/categories/${categoryId}`, categoryData);
  }

  async deleteCategory(categoryId: string, force: boolean = false): Promise<void> {
    await this.delete<void>(`/api/categories/${categoryId}?force=${force}`);
  }

  // Category Documents
  async getCategoryDocuments(
    categoryId: string,
    page: number = 1,
    perPage: number = 20,
    search?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<CategoryDocumentsResponse> {
    const params: Record<string, any> = {
      page,
      per_page: perPage,
    };
    if (search) params.search = search;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;

    return this.get<CategoryDocumentsResponse>(`/api/categories/${categoryId}/documents`, params);
  }

  async getCategoryUsageStats(): Promise<CategoryUsageStats> {
    return this.get<CategoryUsageStats>('/api/categories/usage-stats');
  }

  async getCategoryStats(categoryId: string): Promise<CategoryStats> {
    return this.get<CategoryStats>(`/api/categories/${categoryId}/stats`);
  }

  // Category Search
  async searchCategories(query: string, filters?: Partial<CategoryListParams>): Promise<CategorySearchResult> {
    return this.get<CategorySearchResult>('/api/categories/search', {
      q: query,
      ...filters
    });
  }

  // Category Validation
  async validateCategory(categoryData: CategoryCreateRequest): Promise<CategoryValidationResult> {
    return this.post<CategoryValidationResult>('/api/categories/validate', categoryData);
  }

  async validateCategoryName(name: string, excludeId?: string): Promise<{
    is_valid: boolean;
    message: string;
    suggestions?: string[];
  }> {
    return this.post<{
      is_valid: boolean;
      message: string;
      suggestions?: string[];
    }>('/api/categories/validate-name', {
      name,
      exclude_id: excludeId
    });
  }

  // Category Colors
  async getCategoryColorPalette(): Promise<CategoryColorPalette> {
    return this.get<CategoryColorPalette>('/api/categories/color-palette');
  }

  async getAvailableColors(): Promise<string[]> {
    return this.get<string[]>('/api/categories/available-colors');
  }

  // Bulk Operations
  async bulkUpdateCategories(request: CategoryBulkUpdateRequest): Promise<CategoryBulkOperationResponse> {
    return this.post<CategoryBulkOperationResponse>('/api/categories/bulk-update', request);
  }

  async bulkDeleteCategories(request: CategoryBulkDeleteRequest): Promise<CategoryBulkOperationResponse> {
    return this.post<CategoryBulkOperationResponse>('/api/categories/bulk-delete', request);
  }

  // Category Templates
  async getCategoryTemplates(categoryId: string): Promise<CategoryTemplate[]> {
    return this.get<CategoryTemplate[]>(`/api/categories/${categoryId}/templates`);
  }

  async assignTemplateToCategory(assignment: CategoryTemplateAssignment): Promise<CategoryTemplate> {
    return this.post<CategoryTemplate>('/api/categories/template-assignment', assignment);
  }

  async removeTemplateFromCategory(categoryId: string, templateId: string): Promise<void> {
    await this.delete<void>(`/api/categories/${categoryId}/templates/${templateId}`);
  }

  async setDefaultTemplate(categoryId: string, templateId: string): Promise<CategoryTemplate> {
    return this.put<CategoryTemplate>(`/api/categories/${categoryId}/default-template`, {
      template_id: templateId
    });
  }

  // Category Permissions
  async getCategoryPermissions(): Promise<CategoryPermissions> {
    return this.get<CategoryPermissions>('/api/categories/permissions');
  }

  // Category Analytics
  async getCategoryAnalytics(categoryId: string, dateRange?: {
    start_date: string;
    end_date: string;
  }): Promise<{
    document_count: number;
    total_size: number;
    extraction_success_rate: number;
    avg_processing_time: number;
    most_active_period: string;
    growth_trend: Array<{
      date: string;
      document_count: number;
      size: number;
    }>;
  }> {
    return this.get<{
      document_count: number;
      total_size: number;
      extraction_success_rate: number;
      avg_processing_time: number;
      most_active_period: string;
      growth_trend: Array<{
        date: string;
        document_count: number;
        size: number;
      }>;
    }>(`/api/categories/${categoryId}/analytics`, {
      params: dateRange
    });
  }

  // Category Health
  async getCategoryHealth(categoryId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      suggestion: string;
    }>;
    metrics: {
      document_count: number;
      avg_file_size: number;
      extraction_success_rate: number;
      last_activity: string;
    };
  }> {
    return this.get<{
      status: 'healthy' | 'warning' | 'error';
      issues: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        suggestion: string;
      }>;
      metrics: {
        document_count: number;
        avg_file_size: number;
        extraction_success_rate: number;
        last_activity: string;
      };
    }>(`/api/categories/${categoryId}/health`);
  }

  // Utility Methods
  async getDefaultColors(): Promise<string[]> {
    return Promise.resolve(DEFAULT_CATEGORY_COLORS);
  }

  async getCategorySuggestions(query: string): Promise<string[]> {
    return this.get<string[]>(`/api/categories/suggestions?q=${encodeURIComponent(query)}`);
  }

  async duplicateCategory(categoryId: string, newName: string): Promise<Category> {
    return this.post<Category>(`/api/categories/${categoryId}/duplicate`, {
      name: newName
    });
  }

  async archiveCategory(categoryId: string): Promise<Category> {
    return this.put<Category>(`/api/categories/${categoryId}/archive`);
  }

  async restoreCategory(categoryId: string): Promise<Category> {
    return this.put<Category>(`/api/categories/${categoryId}/restore`);
  }
}
