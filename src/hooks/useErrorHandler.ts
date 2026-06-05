import React, { useState, useCallback } from 'react';
import { AuthError, AuthErrorCode, RecoveryAction } from '../types';
import { errorHandler } from '../services/ErrorHandlingService';

/**
 * Custom hook for centralized error handling in React components
 * 
 * Provides:
 * - Error state management
 * - User-friendly error messages
 * - Recovery actions
 * - Error classification
 * - Consistent error handling across components
 */
export interface UseErrorHandlerReturn {
  error: AuthError | null;
  userFriendlyMessage: string | null;
  recoveryActions: RecoveryAction[];
  shouldShowRetry: boolean;
  handleError: (error: unknown, context?: string) => void;
  createError: (code: AuthErrorCode, message: string, details?: any) => void;
  clearError: () => void;
  retryLastAction: () => Promise<void>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<AuthError | null>(null);
  const [lastRetryAction, setLastRetryAction] = useState<(() => Promise<void>) | null>(null);

  /**
   * Handles any error by classifying it and setting appropriate state
   */
  const handleError = useCallback((error: unknown, context: string = 'component') => {
    const classifiedError = errorHandler.classifyError(error, context);
    setError(classifiedError);
  }, []);

  /**
   * Creates a new error with specified parameters
   */
  const createError = useCallback((
    code: AuthErrorCode, 
    message: string, 
    details?: any
  ) => {
    const newError = errorHandler.createError(code, message, details);
    setError(newError);
  }, []);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setLastRetryAction(null);
  }, []);

  /**
   * Retries the last action if available
   */
  const retryLastAction = useCallback(async () => {
    if (lastRetryAction) {
      try {
        await lastRetryAction();
        clearError();
      } catch (retryError) {
        handleError(retryError, 'retry');
      }
    }
  }, [lastRetryAction, clearError, handleError]);

  // Compute derived values
  const userFriendlyMessage = error ? errorHandler.showUserFriendlyMessage(error) : null;
  const recoveryActions = error ? errorHandler.getRecoveryActions(error) : [];
  const shouldShowRetry = error ? errorHandler.shouldShowRetryOption(error) : false;

  return {
    error,
    userFriendlyMessage,
    recoveryActions,
    shouldShowRetry,
    handleError,
    createError,
    clearError,
    retryLastAction
  };
};

/**
 * Higher-order component for automatic error boundary integration
 */
export const withErrorHandler = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { onError?: (error: AuthError) => void }> => {
  return (props: P & { onError?: (error: AuthError) => void }) => {
    const { handleError } = useErrorHandler();

    const handleComponentError = useCallback((error: unknown) => {
      const classifiedError = errorHandler.classifyError(error, Component.name);
      handleError(error, Component.name);
      props.onError?.(classifiedError);
    }, [handleError, props]);

    // Add error handling to component props
    const enhancedProps = {
      ...props,
      onError: handleComponentError
    } as P & { onError?: (error: AuthError) => void };

    return React.createElement(Component, enhancedProps);
  };
};