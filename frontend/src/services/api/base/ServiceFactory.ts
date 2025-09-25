/**
 * Service Factory for managing domain services
 * Provides centralized service registration and dependency injection
 */
import { AxiosInstance } from 'axios';

export interface ServiceRegistry {
  [key: string]: any;
}

export class ServiceFactory {
  private services: ServiceRegistry = {};
  private axiosInstance: AxiosInstance;
  private initialized: boolean = false;
  private currentTenantId: string | null = null; // Track current tenant

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  /**
   * Register a service in the factory
   */
  register<T>(name: string, service: T): void {
    this.services[name] = service;
  }

  /**
   * Get a service from the factory
   */
  get<T>(name: string): T {
    const service = this.services[name];
    if (!service) {
      throw new Error(`Service '${name}' not found. Available services: ${Object.keys(this.services).join(', ')}`);
    }
    return service;
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Object.keys(this.services);
  }

  /**
   * Check if a service is registered
   */
  hasService(name: string): boolean {
    return name in this.services;
  }

  /**
   * Set authentication token for all services that support it
   */
  setAuthToken(token: string | null): void {
    Object.values(this.services).forEach(service => {
      if (service && typeof service.setAuthToken === 'function') {
        service.setAuthToken(token);
      }
    });
  }

  /**
   * Set tenant ID for all services that support it
   */
  setTenantId(tenantId: string | null): void {
    this.currentTenantId = tenantId;
    Object.values(this.services).forEach(service => {
      if (service && typeof service.setTenantId === 'function') {
        service.setTenantId(tenantId);
      }
    });
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  /**
   * Initialize all services (called after all services are registered)
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Set up global error handling if needed
    this.setupGlobalErrorHandling();
    
    this.initialized = true;
  }

  /**
   * Setup global error handling for all services
   */
  private setupGlobalErrorHandling(): void {
    // Add global error handling if needed
    // This can be extended to handle specific error scenarios
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services = {};
    this.initialized = false;
    this.currentTenantId = null;
  }

  /**
   * Get service count
   */
  getServiceCount(): number {
    return Object.keys(this.services).length;
  }
}
