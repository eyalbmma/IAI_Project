import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../config/environment';

/**
 * Single point of access for all HTTP communications.
 * NO other service should use HttpClient directly.
 * This service enforces SRP by centralizing HTTP concerns.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log('ApiClientService: GET request to:', url, 'with params:', params);
    return this.http.get<T>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError((error) => {
        console.error('ApiClientService: GET error for', url, ':', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('ApiClientService: POST request to:', url, 'with body:', body);
    return this.http.post<T>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error) => {
        console.error('ApiClientService: POST error for', url, ':', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Error handling - delegates to interceptor for normalization
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}

