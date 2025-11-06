import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdsApiService } from '../../../core/services/ads-api.service';
import { Ad, AdsQueryParams } from '../../../core/models/ad.model';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';

/**
 * Ads List Component - Displays list of ads with search, filter, and pagination
 * Follows SRP by focusing on list display and filtering logic
 */
@Component({
  selector: 'app-ads-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SearchBarComponent],
  templateUrl: './ads-list.component.html',
  styleUrl: './ads-list.component.scss'
})
export class AdsListComponent implements OnInit {
  private readonly adsApi = inject(AdsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  searchForm!: FormGroup;
  ads: Ad[] = [];
  loading = false;
  error: string | null = null;
  total = 0;
  page = 1;
  pageSize = 10;
  totalPages = 0;
  
  // Location-based filtering
  useCurrentLocation = false;
  currentLocation: { lat: number; lng: number } | null = null;
  locationRadius = 10; // Default radius in kilometers
  locationError: string | null = null;
  gettingLocation = false;

  ngOnInit(): void {
    this.initializeForm();
    this.setupSearch();
    // Initial load
    this.loadAds();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      q: [''],
      category: [''],
      minPrice: [null],
      maxPrice: [null],
      hasLocation: [false],
      useCurrentLocation: [false],
      locationRadius: [10], // Default 10km
      sortBy: ['createdAt'],
      sortDir: ['desc']
    });
    
    // Listen to useCurrentLocation changes
    this.searchForm.get('useCurrentLocation')?.valueChanges.subscribe(useLocation => {
      this.useCurrentLocation = useLocation;
      if (useLocation && !this.currentLocation) {
        this.getCurrentLocation();
      } else if (!useLocation) {
        this.currentLocation = null;
        this.locationError = null;
        this.page = 1;
        this.loadAds();
      }
    });
    
    // Listen to locationRadius changes - reload ads when radius changes
    this.searchForm.get('locationRadius')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.useCurrentLocation && this.currentLocation) {
        this.page = 1;
        this.loadAds();
      }
    });
  }

  private setupSearch(): void {
    // Listen to form changes with debounce
    this.searchForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 1; // Reset to first page on search/filter change
      this.loadAds();
    });
  }

  private loadAds(): void {
    this.loading = true;
    this.error = null;
    const formValue = this.searchForm.value;
    
    // Build params - only include hasLocation if it's true (checked)
    // Don't send false values as they filter out results unintentionally
    const params: AdsQueryParams = {
      page: this.page,
      pageSize: this.pageSize
    };

    // Only add filters if they have meaningful values
    if (formValue.q) {
      params.q = formValue.q;
    }
    if (formValue.category) {
      params.category = formValue.category;
    }
    if (formValue.minPrice !== null && formValue.minPrice !== undefined && formValue.minPrice !== '') {
      params.minPrice = formValue.minPrice;
    }
    if (formValue.maxPrice !== null && formValue.maxPrice !== undefined && formValue.maxPrice !== '') {
      params.maxPrice = formValue.maxPrice;
    }
    // Only send hasLocation if it's true (user wants to filter by location)
    if (formValue.hasLocation === true) {
      params.hasLocation = true;
    }
    
    // Add current location filtering if enabled and location is available
    if (this.useCurrentLocation && this.currentLocation) {
      params.userLat = this.currentLocation.lat;
      params.userLng = this.currentLocation.lng;
      params.radius = formValue.locationRadius || this.locationRadius;
    }
    
    if (formValue.sortBy) {
      params.sortBy = formValue.sortBy;
    }
    if (formValue.sortDir) {
      params.sortDir = formValue.sortDir;
    }

    console.log('Loading ads with params:', params);
    this.adsApi.getAds(params).subscribe({
      next: (response) => {
        console.log('Ads response received:', response);
        this.ads = response.items || [];
        this.total = response.total || 0;
        this.totalPages = response.totalPages || 0;
        this.loading = false;
        console.log(`Loaded ${this.ads.length} ads out of ${this.total} total`);
      },
      error: (err) => {
        console.error('Error loading ads:', err);
        this.error = err.userMessage || 'Failed to load ads';
        this.loading = false;
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchForm.patchValue({ q: query }, { emitEvent: true });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadAds();
  }

  goToCreate(): void {
    this.router.navigate(['/ads/new']);
  }

  goToDetails(id: string): void {
    this.router.navigate(['/ads', id]);
  }

  /**
   * Get user's current location using browser Geolocation API
   */
  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      this.useCurrentLocation = false;
      this.searchForm.patchValue({ useCurrentLocation: false }, { emitEvent: false });
      return;
    }

    this.gettingLocation = true;
    this.locationError = null;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.gettingLocation = false;
        this.locationError = null;
        console.log('Current location obtained:', this.currentLocation);
        
        // Reload ads with location filter
        this.page = 1;
        this.loadAds();
      },
      (error) => {
        this.gettingLocation = false;
        this.useCurrentLocation = false;
        this.searchForm.patchValue({ useCurrentLocation: false }, { emitEvent: false });
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            this.locationError = 'Location request timed out.';
            break;
          default:
            this.locationError = 'An unknown error occurred while getting location.';
            break;
        }
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
   * Toggle current location filter
   */
  toggleCurrentLocation(): void {
    const useLocation = !this.useCurrentLocation;
    this.searchForm.patchValue({ useCurrentLocation: useLocation }, { emitEvent: true });
  }
}

