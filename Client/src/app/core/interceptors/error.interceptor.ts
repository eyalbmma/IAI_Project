import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Error Interceptor - Normalizes server errors (ProblemDetails) to user-friendly messages
 * Follows SRP by centralizing error handling concerns
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.error && typeof error.error === 'object') {
          // ProblemDetails format
          if (error.error.title) {
            errorMessage = error.error.title;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Status-specific messages
        switch (error.status) {
          case 400:
            errorMessage = errorMessage || 'Invalid request';
            break;
          case 401:
            errorMessage = 'Unauthorized access';
            break;
          case 403:
            errorMessage = 'Access forbidden';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
        }
      }

      // Log error for debugging
      console.error('API Error:', {
        url: req.url,
        status: error.status,
        message: errorMessage,
        error: error.error
      });

      // Re-throw with normalized error
      return throwError(() => ({
        ...error,
        userMessage: errorMessage
      }));
    })
  );
};

