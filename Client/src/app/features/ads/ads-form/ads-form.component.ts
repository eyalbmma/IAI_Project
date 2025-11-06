import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, takeUntil } from 'rxjs';
import { AdsApiService } from '../../../core/services/ads-api.service';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { Ad, CreateAdDto, UpdateAdDto } from '../../../core/models/ad.model';

/**
 * Custom validator: At least phone or email required
 */
function contactValidator(control: AbstractControl): ValidationErrors | null {
  const contact = control.value;
  if (!contact || !contact.name) {
    return { required: true };
  }
  if (!contact.phone && !contact.email) {
    return { contactRequired: 'Phone or email is required' };
  }
  return null;
}

/**
 * Custom validator: If address provided, lat and lng must be provided
 */
function locationValidator(control: AbstractControl): ValidationErrors | null {
  const location = control.value;
  if (!location || !location.address) {
    return null; // Address is optional
  }
  if (location.address && (!location.lat || !location.lng)) {
    return { locationIncomplete: 'Latitude and longitude are required when address is provided' };
  }
  return null;
}

/**
 * Ads Form Component - Handles both create and update operations
 * Follows SRP by focusing on form logic and validation
 */
@Component({
  selector: 'app-ads-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ads-form.component.html',
  styleUrl: './ads-form.component.scss'
})
export class AdsFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly adsApi = inject(AdsApiService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  adForm!: FormGroup;
  isEditMode = false;
  adId: string | null = null;
  loading = false;
  error: string | null = null;
  geocodingInProgress = false;
  geocodingError: string | null = null;
  private addressSubject = new Subject<string>();
  private subscriptions = new Subscription();
  private lastGeocodedAddress: string | null = null;
  private lastSentToSubject: string | null = null;
  private lastSentTime: number = 0;

  ngOnInit(): void {
    console.log('AdsFormComponent ngOnInit called');
    this.initializeForm();
    this.setupAddressGeocoding();
    this.checkEditMode();
    console.log('AdsFormComponent initialization complete');
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - verifying form is ready');
    const addressControl = this.adForm?.get('location.address');
    console.log('Address control in ngAfterViewInit:', addressControl);
    
    if (addressControl) {
      console.log('Address control value:', addressControl.value);
      console.log('Address control status:', addressControl.status);
    } else {
      console.error('ERROR: Address control not found in ngAfterViewInit!');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.addressSubject.complete();
  }

  private initializeForm(): void {
    this.adForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(80)]],
      description: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      price: [null, [Validators.min(0)]],
      category: [''],
      contact: this.fb.group({
        name: ['', Validators.required],
        phone: [''],
        email: ['', Validators.email]
      }, { validators: contactValidator }),
      location: this.fb.group({
        address: [''],
        lat: [null],
        lng: [null]
      }, { validators: locationValidator })
    });

    console.log('Form initialized');
    
    // Subscribe to address changes - send directly to subject, let the subject pipe handle debounce
    const addressControl = this.adForm.get('location.address');
    console.log('Address control:', addressControl);
    
    if (addressControl) {
      console.log('Subscribing to address valueChanges...');
      const addressSubscription = addressControl.valueChanges.subscribe({
        next: (address) => {
          console.log('=== Address valueChanged event triggered ===');
          console.log('Address value:', address);
          
          if (!address || address.trim().length === 0) {
            // Clear coordinates if address is cleared
            const locationGroup = this.adForm.get('location');
            locationGroup?.patchValue({ lat: null, lng: null }, { emitEvent: false });
            this.geocodingError = null;
            this.lastGeocodedAddress = null;
            this.lastSentToSubject = null;
            console.log('Address cleared - coordinates cleared');
            return;
          }
          
          // Normalize addresses for comparison
          const normalizedAddress = address.trim().toLowerCase();
          const lastGeocodedNormalized = this.lastGeocodedAddress?.trim().toLowerCase() || '';
          const lastSentNormalized = this.lastSentToSubject?.trim().toLowerCase() || '';
          
          // Check if we already geocoded this exact address
          if (normalizedAddress === lastGeocodedNormalized) {
            const locationGroup = this.adForm.get('location');
            const currentLat = locationGroup?.get('lat')?.value;
            const currentLng = locationGroup?.get('lng')?.value;
            
            // If coordinates exist, skip geocoding
            if (currentLat && currentLng) {
              console.log('Skipping geocoding - address already geocoded:', address);
              return;
            }
          }
          
          // Send to subject - let debounceTime and switchMap handle the optimization
          // debounceTime will wait for user to stop typing
          // switchMap will cancel previous requests if user continues typing
          console.log('Sending address to geocoding pipe:', address);
          this.lastSentToSubject = address;
          this.lastSentTime = Date.now();
          this.addressSubject.next(address);
        },
        error: (error) => {
          console.error('Error in address valueChanges subscription:', error);
        }
      });
      
      this.subscriptions.add(addressSubscription);
      console.log('Address subscription added to subscriptions');
    } else {
      console.error('ERROR: addressControl is null! Cannot subscribe to valueChanges');
    }
  }

  private setupAddressGeocoding(): void {
    console.log('setupAddressGeocoding called');
    
    // Debounce at the subject level - wait 1500ms after user stops typing
    // Then use switchMap to cancel previous requests if user continues typing
    const geocodingSubscription = this.addressSubject.pipe(
      // Wait 1500ms after last value sent to subject
      debounceTime(1500),
      // Only proceed if address actually changed
      distinctUntilChanged((prev, curr) => {
        const prevNormalized = (prev || '').trim().toLowerCase();
        const currNormalized = (curr || '').trim().toLowerCase();
        return prevNormalized === currNormalized;
      }),
      // Filter empty addresses (shouldn't happen, but safety check)
      filter((address): address is string => {
        return !!(address && address.trim().length > 0);
      }),
      // Set loading state
      tap(() => {
        console.log('Starting geocoding...');
        this.geocodingInProgress = true;
        this.geocodingError = null;
      }),
      // switchMap will automatically cancel previous requests when a new one comes in
      // This is critical - if user types fast, only the last request will complete
      switchMap(address => {
        console.log('=== Calling geocoding service for:', address);
        // Store the address we're geocoding for this request
        const requestedAddress = address.trim().toLowerCase();
        
        return this.geocodingService.geocodeAddress(address).pipe(
          tap({
            next: (result) => {
              console.log('Geocoding result received for:', address);
              
              // Verify that the address hasn't changed since we started this request
              const locationGroup = this.adForm.get('location');
              if (locationGroup) {
                const currentAddress = locationGroup.get('address')?.value || '';
                const currentAddressNormalized = currentAddress.trim().toLowerCase();
                
                // Only update if the address matches what we requested
                // This prevents stale results from updating the form
                if (currentAddressNormalized === requestedAddress) {
                  console.log('Address matches - updating coordinates');
                  this.geocodingInProgress = false;
                  this.geocodingError = null;
                  this.lastGeocodedAddress = currentAddress;
                  this.lastSentToSubject = currentAddress; // Update last sent as well
                  
                  locationGroup.patchValue({
                    lat: result.lat,
                    lng: result.lng
                  }, { emitEvent: false });
                  console.log('Coordinates updated successfully');
                } else {
                  console.log('Address changed during geocoding - ignoring stale result');
                  console.log('Requested:', requestedAddress, 'Current:', currentAddressNormalized);
                  // Don't update geocodingInProgress here - let the new request handle it
                }
              }
            },
            error: (error) => {
              // Only show error if this is still the current address
              const locationGroup = this.adForm.get('location');
              if (locationGroup) {
                const currentAddress = locationGroup.get('address')?.value || '';
                const currentAddressNormalized = currentAddress.trim().toLowerCase();
                
                if (currentAddressNormalized === requestedAddress) {
                  console.error('Geocoding error:', error);
                  this.geocodingInProgress = false;
                  this.geocodingError = error.message || 'Failed to geocode address. Please enter coordinates manually.';
                } else {
                  console.log('Error for stale request - ignoring');
                }
              }
            }
          })
        );
      })
    ).subscribe({
      next: (result) => {
        // Result is already handled in tap
        console.log('Geocoding subscription next');
      },
      error: (error) => {
        console.error('Geocoding subscription error:', error);
        this.geocodingInProgress = false;
        this.geocodingError = error.message || 'Failed to geocode address. Please enter coordinates manually.';
      }
    });

    this.subscriptions.add(geocodingSubscription);
  }

  private checkEditMode(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.adId = id;
        this.loadAd(id);
      }
    });
  }

  private loadAd(id: string): void {
    this.loading = true;
    this.adsApi.getAd(id).subscribe({
      next: (ad) => {
        this.adForm.patchValue({
          title: ad.title,
          description: ad.description,
          price: ad.price,
          category: ad.category,
          contact: ad.contact,
          location: ad.location || {}
        }, { emitEvent: false }); // Don't trigger geocoding when loading existing ad
        this.loading = false;
      },
      error: (err) => {
        this.error = err.userMessage || 'Failed to load ad';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.adForm.invalid) {
      this.markFormGroupTouched(this.adForm);
      return;
    }

    this.loading = true;
    this.error = null;

    const formValue = this.adForm.value;
    const dto: CreateAdDto | UpdateAdDto = {
      title: formValue.title,
      description: formValue.description,
      price: formValue.price || undefined,
      category: formValue.category || undefined,
      contact: {
        name: formValue.contact.name,
        phone: formValue.contact.phone || undefined,
        email: formValue.contact.email || undefined
      },
      location: formValue.location.address ? {
        address: formValue.location.address,
        lat: formValue.location.lat,
        lng: formValue.location.lng
      } : undefined
    };

    const operation = this.isEditMode
      ? this.adsApi.updateAd(this.adId!, dto as UpdateAdDto)
      : this.adsApi.createAd(dto as CreateAdDto);

    operation.subscribe({
      next: (ad) => {
        this.loading = false;
        this.router.navigate(['/ads', ad.id]);
      },
      error: (err) => {
        this.error = err.userMessage || 'Failed to save ad';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/ads']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.adForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors?.['minlength']) {
        return `${fieldName} is too short`;
      }
      if (field.errors?.['maxlength']) {
        return `${fieldName} is too long`;
      }
      if (field.errors?.['min']) {
        return `${fieldName} must be >= 0`;
      }
      if (field.errors?.['email']) {
        return 'Invalid email format';
      }
    }
    return null;
  }

  getContactError(): string | null {
    const contactGroup = this.adForm.get('contact');
    if (contactGroup && contactGroup.invalid && contactGroup.touched) {
      if (contactGroup.errors?.['contactRequired']) {
        return contactGroup.errors['contactRequired'];
      }
    }
    return null;
  }

  getLocationError(): string | null {
    const locationGroup = this.adForm.get('location');
    if (locationGroup && locationGroup.invalid && locationGroup.touched) {
      if (locationGroup.errors?.['locationIncomplete']) {
        return locationGroup.errors['locationIncomplete'];
      }
    }
    return null;
  }
}

