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
      sortBy: ['createdAt'],
      sortDir: ['desc']
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
    const params: AdsQueryParams = {
      ...formValue,
      page: this.page,
      pageSize: this.pageSize
    };

    this.adsApi.getAds(params).subscribe({
      next: (response) => {
        this.ads = response.items;
        this.total = response.total;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (err) => {
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
}

