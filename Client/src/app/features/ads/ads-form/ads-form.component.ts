import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, takeUntil, take, catchError } from 'rxjs';
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
            // Don't clear geocodingError here - keep it so user knows there was an error
            // It will be cleared when a new successful geocoding happens
            this.lastGeocodedAddress = null;
            this.lastSentToSubject = null;
            console.log('Address cleared - coordinates cleared (keeping error state)');
            return;
          }
          
          // Normalize addresses for comparison
          const normalizedAddress = address.trim().toLowerCase();
          const lastGeocodedNormalized = this.lastGeocodedAddress?.trim().toLowerCase() || '';
          const lastSentNormalized = this.lastSentToSubject?.trim().toLowerCase() || '';
          
          // Check if we already geocoded this exact address successfully (with coordinates)
          if (normalizedAddress === lastGeocodedNormalized && lastGeocodedNormalized !== '') {
            const locationGroup = this.adForm.get('location');
            const currentLat = locationGroup?.get('lat')?.value;
            const currentLng = locationGroup?.get('lng')?.value;
            
            // If coordinates exist, skip geocoding
            if (currentLat && currentLng) {
              console.log('Skipping geocoding - address already geocoded successfully:', address);
              return;
            }
          }
          
          // If there was an error with the previous address, always retry with new address
          // Also check if this is a different address than what was sent before
          // If there's an error, always send the new address (even if it's the same, to retry)
          const hasError = this.geocodingError !== null;
          const isDifferentAddress = normalizedAddress !== lastSentNormalized;
          const shouldSend = hasError || isDifferentAddress;
          
          if (!shouldSend) {
            console.log('Skipping geocoding - same address already sent (no error):', address);
            return;
          }
          
          if (hasError) {
            console.log('Previous geocoding had error - will retry with address:', address);
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
    
    // Track the current request ID to ignore stale responses
    let currentRequestId = 0;
    let cancelPreviousRequest = new Subject<void>();
    
    // Debounce at the subject level - wait 1500ms after user stops typing
    // Then use switchMap to cancel previous requests if user continues typing
    const geocodingSubscription = this.addressSubject.pipe(
      // Wait 1500ms after last value sent to subject
      debounceTime(1500),
      // Only proceed if address actually changed
      // But if there was an error, always allow new address even if it looks the same
      distinctUntilChanged((prev, curr) => {
        // If there's an error, always allow new address (force retry)
        if (this.geocodingError !== null) {
          return false; // Force distinct (allow through)
        }
        const prevNormalized = (prev || '').trim().toLowerCase();
        const currNormalized = (curr || '').trim().toLowerCase();
        return prevNormalized === currNormalized;
      }),
      // Filter empty addresses (shouldn't happen, but safety check)
      filter((address): address is string => {
        return !!(address && address.trim().length > 0);
      }),
      // Cancel previous request and increment request ID
      tap(() => {
        // Cancel previous request
        cancelPreviousRequest.next();
        cancelPreviousRequest.complete();
        // Create new cancel subject for next request
        cancelPreviousRequest = new Subject<void>();
        
        currentRequestId++;
        const requestId = currentRequestId;
        console.log(`Starting geocoding... (request ID: ${requestId})`);
        this.geocodingInProgress = true;
        // Don't clear geocodingError here - let it be cleared only when request succeeds
        // This allows the error state to persist until a successful geocoding
      }),
      // switchMap will automatically cancel previous requests when a new one comes in
      // This is critical - if user types fast, only the last request will complete
      switchMap(address => {
        const requestId = currentRequestId;
        const requestedAddress = address.trim();
        const requestedAddressNormalized = requestedAddress.toLowerCase();
        const cancelSubject = cancelPreviousRequest; // Capture current cancel subject
        
        console.log(`=== Calling geocoding service for: "${requestedAddress}" (request ID: ${requestId})`);
        
        return this.geocodingService.geocodeAddress(requestedAddress).pipe(
          // Cancel this request if a new one comes in
          takeUntil(cancelSubject),
          // Only take the first result (in case of multiple emissions)
          take(1),
          tap({
            next: (result) => {
              // Check if this is still the current request
              if (requestId !== currentRequestId) {
                console.log(`Ignoring stale result for request ID ${requestId} (current: ${currentRequestId})`);
                return;
              }
              
              console.log(`Geocoding result received for: "${requestedAddress}" (request ID: ${requestId})`);
              
              // Verify that the address hasn't changed since we started this request
              const locationGroup = this.adForm.get('location');
              if (locationGroup) {
                const currentAddress = locationGroup.get('address')?.value || '';
                const currentAddressNormalized = currentAddress.trim().toLowerCase();
                
                // Only update if the address matches what we requested
                // This prevents stale results from updating the form
                if (currentAddressNormalized === requestedAddressNormalized && requestId === currentRequestId) {
                  console.log('Address matches - updating coordinates');
                  this.geocodingInProgress = false;
                  this.geocodingError = null;
                  this.lastGeocodedAddress = currentAddress;
                  this.lastSentToSubject = currentAddress;
                  
                  locationGroup.patchValue({
                    lat: result.lat,
                    lng: result.lng
                  }, { emitEvent: false });
                  console.log('Coordinates updated successfully');
                } else {
                  console.log('Address changed during geocoding - ignoring stale result');
                  console.log('Requested:', requestedAddressNormalized, 'Current:', currentAddressNormalized);
                }
              }
            },
            error: (error) => {
              // Check if this is still the current request
              if (requestId !== currentRequestId) {
                console.log(`Ignoring stale error for request ID ${requestId} (current: ${currentRequestId})`);
                return;
              }
              
              // Only show error if this is still the current address
              const locationGroup = this.adForm.get('location');
              if (locationGroup) {
                const currentAddress = locationGroup.get('address')?.value || '';
                const currentAddressNormalized = currentAddress.trim().toLowerCase();
                
                if (currentAddressNormalized === requestedAddressNormalized && requestId === currentRequestId) {
                  console.error('Geocoding error:', error);
                  this.geocodingInProgress = false;
                  this.geocodingError = error.message || 'Failed to geocode address. Please enter coordinates manually.';
                  // Clear lastGeocodedAddress to allow retry with different address
                  this.lastGeocodedAddress = null;
                  this.lastSentToSubject = null;
                  console.log('Error occurred - cleared lastGeocodedAddress to allow retry');
                } else {
                  console.log('Error for stale request - ignoring');
                }
              }
            }
          }),
          // IMPORTANT: swallow errors so the outer stream stays alive after 4xx/5xx
          catchError((error) => {
            // Only handle if still current request and address matches
            if (requestId === currentRequestId) {
              const locationGroup = this.adForm.get('location');
              if (locationGroup) {
                const currentAddress = locationGroup.get('address')?.value || '';
                const currentAddressNormalized = currentAddress.trim().toLowerCase();
                if (currentAddressNormalized === requestedAddressNormalized) {
                  console.error('Geocoding error (caught):', error);
                  this.geocodingInProgress = false;
                  this.geocodingError = error.message || 'Failed to geocode address. Please enter coordinates manually.';
                  this.lastGeocodedAddress = null;
                  this.lastSentToSubject = null;
                  console.log('Error occurred (caught) - cleared lastGeocodedAddress to allow retry');
                }
              }
            }
            // Do not error the stream; allow further addresses to be processed
            return EMPTY;
          })
        );
      })
    ).subscribe({
      next: (result) => {
        // Result is already handled in tap
        console.log('Geocoding subscription next');
      },
      error: (error) => {
        // Should rarely happen now; keep as fallback
        console.error('Geocoding subscription error (unexpected):', error);
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

