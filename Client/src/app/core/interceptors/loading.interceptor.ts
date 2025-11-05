import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

/**
 * Loading Interceptor - Manages global loading state
 * Can be extended to use a loading service for UI indicators
 */
let activeRequests = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Increment active requests
  activeRequests++;

  // Set loading state (can be connected to a loading service)
  // For now, we just track the count
  if (activeRequests === 1) {
    // Start loading indicator
    document.body.classList.add('loading');
  }

  return next(req).pipe(
    finalize(() => {
      activeRequests--;
      if (activeRequests === 0) {
        // Stop loading indicator
        document.body.classList.remove('loading');
      }
    })
  );
};

