/**
 * Ad Model - Core domain model for advertisements
 */

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
}

export interface Location {
  address?: string;
  lat?: number;
  lng?: number;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  price?: number;
  category?: string;
  contact: Contact;
  location?: Location;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdDto {
  title: string;
  description: string;
  price?: number;
  category?: string;
  contact: Contact;
  location?: Location;
}

export interface UpdateAdDto {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  contact?: Contact;
  location?: Location;
}

export interface AdsQueryParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  hasLocation?: boolean;
  // Location-based filtering (user's current location)
  userLat?: number;  // User's current latitude
  userLng?: number;   // User's current longitude
  radius?: number;    // Radius in kilometers (default: 10km)
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AdsResponse {
  items: Ad[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

