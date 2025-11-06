import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export interface GeocodingRequest {
  address: string;
}

/**
 * Service for geocoding addresses to coordinates
 * Uses the backend API to geocode addresses
 */
@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Geocode an address to get latitude and longitude
   * @param address The address to geocode
   * @returns Observable with geocoding result containing lat and lng
   */
  geocodeAddress(address: string): Observable<GeocodingResult> {
    if (!address || address.trim().length === 0) {
      throw new Error('Address cannot be empty');
    }

    const request: GeocodingRequest = { address: address.trim() };
    console.log('GeocodingService: Calling geocode API with address:', address);
    return this.apiClient.post<GeocodingResult>('/Geocoding/geocode', request);
  }
}

