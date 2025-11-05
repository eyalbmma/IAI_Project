import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AdsApiService } from '../../../core/services/ads-api.service';
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
export class AdsFormComponent implements OnInit {
  private readonly adsApi = inject(AdsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  adForm!: FormGroup;
  isEditMode = false;
  adId: string | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
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
        });
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

