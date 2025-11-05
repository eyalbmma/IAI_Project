import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { Ad, CreateAdDto, UpdateAdDto, AdsQueryParams, AdsResponse } from '../models/ad.model';

/**
 * Domain-specific service for Ads operations.
 * Wraps ApiClientService - follows SRP by focusing on Ads domain logic.
 * NO direct HTTP calls - all go through ApiClientService.
 */
@Injectable({
  providedIn: 'root'
})
export class AdsApiService {
  private readonly apiClient = inject(ApiClientService);
  private readonly endpoint = '/ads';

  /**
   * Get list of ads with query parameters
   */
  getAds(query: AdsQueryParams = {}): Observable<AdsResponse> {
    return this.apiClient.get<AdsResponse>(this.endpoint, query);
  }

  /**
   * Get single ad by ID
   */
  getAd(id: string): Observable<Ad> {
    return this.apiClient.get<Ad>(`${this.endpoint}/${id}`);
  }

  /**
   * Create new ad
   */
  createAd(dto: CreateAdDto): Observable<Ad> {
    return this.apiClient.post<Ad>(this.endpoint, dto);
  }

  /**
   * Update existing ad
   */
  updateAd(id: string, dto: UpdateAdDto): Observable<Ad> {
    return this.apiClient.put<Ad>(`${this.endpoint}/${id}`, dto);
  }

  /**
   * Delete ad
   */
  deleteAd(id: string): Observable<void> {
    return this.apiClient.delete<void>(`${this.endpoint}/${id}`);
  }
}

