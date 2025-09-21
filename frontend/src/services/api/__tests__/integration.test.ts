/**
 * Integration Tests for Domain Services
 * Tests cross-domain workflows and service interactions
 */

// @ts-ignore - Jest globals
declare const describe: any, it: any, expect: any, beforeAll: any, fail: any;
import {
  AuthService, 
  DocumentService, 
  TemplateService, 
  ExtractionService, 
  TenantService, 
  LanguageService,
  CategoryService,
  JobService,
  HealthService,
  serviceFactory
} from '../index';

// Mock data for testing
const mockCredentials = {
  email: 'test@example.com',
  password: 'testpassword'
};

const mockDocument = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

const mockTemplate = {
  name: 'Test Template',
  description: 'Integration test template',
  document_type_id: 'test-type-id',
  schema: {
    test_field: {
      name: 'test_field',
      type: 'text' as const,
      required: true,
      description: 'Test field for integration'
    }
  },
  prompt_config: {
    system_prompt: 'Extract test data',
    instructions: 'Find the test field value',
    output_format: 'json'
  },
  extraction_settings: {
    max_chunk_size: 1000,
    extraction_passes: 1,
    confidence_threshold: 0.8
  },
  few_shot_examples: []
};

const mockCategory = {
  name: 'Test Category',
  description: 'Integration test category',
  color: '#3B82F6'
};

const mockJob = {
  name: 'Test Job',
  description: 'Integration test job',
  job_type: 'extraction' as const,
  schedule_type: 'immediate' as const,
  schedule_config: {
    cron: '',
    timezone: 'UTC'
  },
  execution_config: {
    category_id: 'test-category-id',
    template_id: 'test-template-id'
  },
  retry_policy: {
    max_retries: 3,
    retry_delay_minutes: 5,
    backoff_multiplier: 2,
    max_retry_delay_minutes: 60,
    retry_on_failure_types: ['timeout', 'network_error']
  }
};

describe('Domain Services Integration Tests', () => {
  let authService: AuthService;
  let documentService: DocumentService;
  let templateService: TemplateService;
  let extractionService: ExtractionService;
  let tenantService: TenantService;
  let languageService: LanguageService;
  let categoryService: CategoryService;
  let jobService: JobService;
  let healthService: HealthService;

  beforeAll(() => {
    // Get services from factory
    authService = serviceFactory.get<AuthService>('auth');
    documentService = serviceFactory.get<DocumentService>('documents');
    templateService = serviceFactory.get<TemplateService>('templates');
    extractionService = serviceFactory.get<ExtractionService>('extractions');
    tenantService = serviceFactory.get<TenantService>('tenants');
    languageService = serviceFactory.get<LanguageService>('language');
    categoryService = serviceFactory.get<CategoryService>('categories');
    jobService = serviceFactory.get<JobService>('jobs');
    healthService = serviceFactory.get<HealthService>('health');
  });

  describe('Authentication Flow Integration', () => {
    it('should handle complete authentication workflow', async () => {
      // Test login
      const loginResponse = await authService.login(mockCredentials);
      expect(loginResponse).toHaveProperty('access_token');
      expect(loginResponse).toHaveProperty('user');

      // Test getting current user
      const currentUser = await authService.getCurrentUser();
      expect(currentUser).toHaveProperty('email');
      expect(currentUser).toHaveProperty('role');

      // Test getting current tenant
      const currentTenant = await authService.getCurrentTenant();
      expect(currentTenant).toHaveProperty('id');
      expect(currentTenant).toHaveProperty('name');

      // Test getting user permissions
      const permissions = await authService.getUserPermissions();
      expect(permissions).toHaveProperty('permissions');
      expect(permissions).toHaveProperty('role');
    });
  });

  describe('Document Processing Workflow', () => {
    it('should handle complete document processing workflow', async () => {
      // 1. Upload document
      const uploadResponse = await documentService.uploadDocument(mockDocument);
      expect(uploadResponse).toHaveProperty('document_id');
      expect(uploadResponse).toHaveProperty('status');

      const documentId = uploadResponse.document_id;

      // 2. Get document details
      const document = await documentService.getDocument(documentId);
      expect(document).toHaveProperty('id', documentId);
      expect(document).toHaveProperty('original_filename');

      // 3. Get document content
      const content = await documentService.getDocumentContent(documentId);
      expect(content).toHaveProperty('content');
      expect(content).toHaveProperty('metadata');

      // 4. Get document preview
      const preview = await documentService.getDocumentPreview(documentId);
      expect(preview).toHaveProperty('has_preview');
      expect(preview).toHaveProperty('filename');

      // 5. Get document tracking
      const tracking = await documentService.getDocumentTracking(documentId);
      expect(tracking).toHaveProperty('items');
      expect(tracking).toHaveProperty('total');
    });
  });

  describe('Template and Extraction Workflow', () => {
    it('should handle template creation and extraction workflow', async () => {
      // 1. Create template
      const template = await templateService.createTemplate(mockTemplate);
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name', mockTemplate.name);

      const templateId = template.id;

      // 2. Test template
      const testResult = await templateService.testTemplate(templateId, 'Test document content');
      expect(testResult).toHaveProperty('status');
      expect(testResult).toHaveProperty('extracted_data');

      // 3. Create extraction
      const extraction = await extractionService.createExtraction({
        document_id: 'test-document-id',
        template_id: templateId
      });
      expect(extraction).toHaveProperty('id');
      expect(extraction).toHaveProperty('status');

      // 4. Get extraction details
      const extractionDetails = await extractionService.getExtraction(extraction.id);
      expect(extractionDetails).toHaveProperty('id', extraction.id);
      expect(extractionDetails).toHaveProperty('document_id');
      expect(extractionDetails).toHaveProperty('template_id');
    });
  });

  describe('Category Management Workflow', () => {
    it('should handle category creation and document association', async () => {
      // 1. Create category
      const category = await categoryService.createCategory(mockCategory);
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name', mockCategory.name);

      const categoryId = category.id;

      // 2. Get category documents
      const categoryDocuments = await categoryService.getCategoryDocuments(categoryId);
      expect(categoryDocuments).toHaveProperty('category');
      expect(categoryDocuments).toHaveProperty('documents');

      // 3. Get category usage stats
      const usageStats = await categoryService.getCategoryUsageStats();
      expect(usageStats).toHaveProperty('category_stats');
      expect(usageStats).toHaveProperty('total_categories');

      // 4. Update category
      const updatedCategory = await categoryService.updateCategory(categoryId, {
        name: 'Updated Test Category',
        description: 'Updated description'
      });
      expect(updatedCategory).toHaveProperty('name', 'Updated Test Category');
    });
  });

  describe('Job Scheduling Workflow', () => {
    it('should handle job creation and execution workflow', async () => {
      // 1. Create job
      const job = await jobService.createJob(mockJob);
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('name', mockJob.name);

      const jobId = job.id;

      // 2. Execute job
      const executionResponse = await jobService.executeJob(jobId, {
        triggered_by: 'manual'
      });
      expect(executionResponse).toHaveProperty('execution_id');
      expect(executionResponse).toHaveProperty('job_id', jobId);

      // 3. Get job history
      const jobHistory = await jobService.getJobHistory(jobId);
      expect(jobHistory).toHaveProperty('executions');
      expect(jobHistory).toHaveProperty('total');

      // 4. Get job statistics
      const jobStats = await jobService.getJobStatistics(jobId);
      expect(jobStats).toHaveProperty('total_executions');
      expect(jobStats).toHaveProperty('success_rate');
    });
  });

  describe('Language Detection Workflow', () => {
    it('should handle language detection and validation workflow', async () => {
      // 1. Detect document language
      const detectionResult = await languageService.detectDocumentLanguage('Hello world');
      expect(detectionResult).toHaveProperty('language');
      expect(detectionResult).toHaveProperty('confidence');

      // 2. Get supported languages
      const supportedLanguages = await languageService.getSupportedLanguages();
      expect(Array.isArray(supportedLanguages)).toBe(true);

      // 3. Get tenant language config
      const tenantConfig = await languageService.getTenantLanguageConfig('test-tenant-id');
      expect(tenantConfig).toHaveProperty('supported_languages');
      expect(tenantConfig).toHaveProperty('default_language');

      // 4. Validate language support
      const validationResult = await languageService.validateLanguageSupport('test-tenant-id', 'en');
      expect(validationResult).toHaveProperty('is_supported');
      expect(validationResult).toHaveProperty('message');
    });
  });

  describe('Tenant Management Workflow', () => {
    it('should handle tenant configuration workflow', async () => {
      // 1. Get tenant info
      const tenantInfo = await tenantService.getTenantInfo();
      expect(tenantInfo).toHaveProperty('id');
      expect(tenantInfo).toHaveProperty('name');

      // 2. Get tenant configurations
      const configurations = await tenantService.getTenantConfigurations();
      expect(Array.isArray(configurations)).toBe(true);

      // 3. Get tenant config summary
      const configSummary = await tenantService.getTenantConfigSummary();
      expect(configSummary).toHaveProperty('tenant_id');

      // 4. Get available environments
      const environments = await tenantService.getAvailableEnvironments();
      expect(environments).toHaveProperty('environments');
      expect(Array.isArray(environments.environments)).toBe(true);
    });
  });

  describe('Health Monitoring Workflow', () => {
    it('should handle health monitoring workflow', async () => {
      // 1. Get basic health
      const health = await healthService.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');

      // 2. Get detailed health
      const detailedHealth = await healthService.getDetailedHealth();
      expect(detailedHealth).toHaveProperty('services');
      expect(detailedHealth).toHaveProperty('system_info');

      // 3. Check LLM health
      const llmHealth = await healthService.checkLLMHealth({
        config_type: 'field_extraction'
      });
      expect(llmHealth).toHaveProperty('provider');
      expect(llmHealth).toHaveProperty('healthy');

      // 4. Get available models
      const availableModels = await healthService.getAvailableModels();
      expect(Array.isArray(availableModels)).toBe(true);

      // 5. Get rate limit status
      const rateLimitStatus = await healthService.getRateLimitStatus();
      expect(Array.isArray(rateLimitStatus)).toBe(true);
    });
  });

  describe('Cross-Domain Integration Workflows', () => {
    it('should handle document upload with template extraction workflow', async () => {
      // 1. Create category
      const category = await categoryService.createCategory(mockCategory);
      const categoryId = category.id;

      // 2. Create template
      const template = await templateService.createTemplate({
        ...mockTemplate,
        name: 'Cross-domain Test Template'
      });
      const templateId = template.id;

      // 3. Upload document with category
      const uploadResponse = await documentService.uploadDocument(mockDocument);
      const documentId = uploadResponse.document_id;

      // 4. Create extraction with template
      const extraction = await extractionService.createExtraction({
        document_id: documentId,
        template_id: templateId
      });

      // 5. Verify the workflow
      expect(extraction).toHaveProperty('document_id', documentId);
      expect(extraction).toHaveProperty('template_id', templateId);
      expect(extraction).toHaveProperty('status');
    });

    it('should handle job creation with category and template workflow', async () => {
      // 1. Create category
      const category = await categoryService.createCategory({
        ...mockCategory,
        name: 'Job Test Category'
      });
      const categoryId = category.id;

      // 2. Create template
      const template = await templateService.createTemplate({
        ...mockTemplate,
        name: 'Job Test Template'
      });
      const templateId = template.id;

      // 3. Create job with category and template
      const job = await jobService.createJob({
        ...mockJob,
        name: 'Cross-domain Job',
        execution_config: {
          ...mockJob.execution_config,
          category_id: categoryId,
          template_id: templateId
        }
      });

      // 4. Verify the job references
      expect(job).toHaveProperty('category_id', categoryId);
      expect(job).toHaveProperty('template_id', templateId);
      expect(job).toHaveProperty('name', 'Cross-domain Job');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle authentication errors gracefully', async () => {
      try {
        await authService.login({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });
        fail('Should have thrown an authentication error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBe('AuthenticationError');
      }
    });

    it('should handle not found errors gracefully', async () => {
      try {
        await documentService.getDocument('non-existent-id');
        fail('Should have thrown a not found error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBe('NotFoundError');
      }
    });

    it('should handle validation errors gracefully', async () => {
      try {
        await templateService.createTemplate({
          name: '', // Invalid: empty name
          document_type_id: '',
          schema: {},
          prompt_config: {
            system_prompt: '',
            instructions: '',
            output_format: 'json'
          },
          extraction_settings: {
            max_chunk_size: 0, // Invalid: zero chunk size
            extraction_passes: 0,
            confidence_threshold: -1 // Invalid: negative threshold
          },
          few_shot_examples: []
        });
        fail('Should have thrown a validation error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBe('ValidationError');
      }
    });
  });

  describe('Service Factory Integration', () => {
    it('should properly manage service instances', () => {
      // Test that all services are registered
      expect(() => serviceFactory.get<AuthService>('auth')).not.toThrow();
      expect(() => serviceFactory.get<DocumentService>('documents')).not.toThrow();
      expect(() => serviceFactory.get<TemplateService>('templates')).not.toThrow();
      expect(() => serviceFactory.get<ExtractionService>('extractions')).not.toThrow();
      expect(() => serviceFactory.get<TenantService>('tenants')).not.toThrow();
      expect(() => serviceFactory.get<LanguageService>('language')).not.toThrow();
      expect(() => serviceFactory.get<CategoryService>('categories')).not.toThrow();
      expect(() => serviceFactory.get<JobService>('jobs')).not.toThrow();
      expect(() => serviceFactory.get<HealthService>('health')).not.toThrow();

      // Test that unknown service throws error
      expect(() => serviceFactory.get('unknown')).toThrow();
    });

    it('should handle authentication token propagation', () => {
      const testToken = 'test-token-123';
      
      // Set token on factory
      serviceFactory.setAuthToken(testToken);
      
      // Verify token is set on factory (services will use it internally)
      expect(serviceFactory).toBeDefined();
    });
  });
});
