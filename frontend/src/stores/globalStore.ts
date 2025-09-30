/**
 * Unified Global State Store using Zustand
 * Handles all global state concerns including errors, notifications, loading, etc.
 */

import { create } from 'zustand';

// Error state interface
interface ErrorState {
  hasError: boolean;
  errorType: string | null;
  errorMessage: string | null;
  errorDetails: unknown;
}

// Scoped error state interface
interface ScopedErrorState {
  [scope: string]: ErrorState;
}

// Global state interface
interface GlobalState {
  // Error handling
  errors: ErrorState;
  scopedErrors: ScopedErrorState;
  
  // Actions
  setError: (type: string, message: string, details?: unknown) => void;
  clearError: () => void;
  setScopedError: (scope: string, type: string, message: string, details?: unknown) => void;
  clearScopedError: (scope: string) => void;
}

// Create the global store
export const useGlobalStore = create<GlobalState>((set) => ({
  // Initial error state
  errors: {
    hasError: false,
    errorType: null,
    errorMessage: null,
    errorDetails: null,
  },
  scopedErrors: {},
  
  // Error actions
  setError: (type: string, message: string, details?: unknown) =>
    set(() => ({
      errors: {
        hasError: true,
        errorType: type,
        errorMessage: message,
        errorDetails: details,
      }
    })),

  clearError: () =>
    set(() => ({
      errors: {
        hasError: false,
        errorType: null,
        errorMessage: null,
        errorDetails: null,
      }
    })),

  setScopedError: (scope: string, type: string, message: string, details?: unknown) =>
    set((state) => ({
      scopedErrors: {
        ...state.scopedErrors,
        [scope]: {
          hasError: true,
          errorType: type,
          errorMessage: message,
          errorDetails: details,
        }
      }
    })),

  clearScopedError: (scope: string) =>
    set((state) => ({
      scopedErrors: {
        ...state.scopedErrors,
        [scope]: {
          hasError: false,
          errorType: null,
          errorMessage: null,
          errorDetails: null,
        }
      }
    })),
}));

// Selector hooks for easier usage
export const useErrorState = () => useGlobalStore((state) => state.errors);
export const useErrorActions = () => {
  const setError = useGlobalStore((state) => state.setError);
  const clearError = useGlobalStore((state) => state.clearError);
  return { setError, clearError };
};

// Scoped error hooks
export const useScopedErrorState = (scope: string) => 
  useGlobalStore((state) => state.scopedErrors[scope] || {
    hasError: false,
    errorType: null,
    errorMessage: null,
    errorDetails: null,
  });

export const useScopedErrorActions = () => {
  const setScopedError = useGlobalStore((state) => state.setScopedError);
  const clearScopedError = useGlobalStore((state) => state.clearScopedError);
  return { setScopedError, clearScopedError };
};
