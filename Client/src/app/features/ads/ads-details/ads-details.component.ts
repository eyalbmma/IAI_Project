import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AdsApiService } from '../../../core/services/ads-api.service';
import { Ad } from '../../../core/models/ad.model';

/**
 * Ads Details Component - Displays single ad with edit/delete options
 * Follows SRP by focusing on ad display and actions
 */
@Component({
  selector: 'app-ads-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ads-details.component.html',
  styleUrl: './ads-details.component.scss'
})
export class AdsDetailsComponent implements OnInit {
  private readonly adsApi = inject(AdsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ad: Ad | null = null;
  loading = false;
  error: string | null = null;
  deleting = false;

  ngOnInit(): void {
    this.loadAd();
  }

  private loadAd(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loading = true;
        this.error = null;
        this.adsApi.getAd(id).subscribe({
          next: (ad) => {
            this.ad = ad;
            this.loading = false;
          },
          error: (err) => {
            this.error = err.userMessage || 'Failed to load ad';
            this.loading = false;
          }
        });
      }
    });
  }

  onEdit(): void {
    if (this.ad) {
      this.router.navigate(['/ads', this.ad.id, 'edit']);
    }
  }

  onDelete(): void {
    if (!this.ad) return;

    if (!confirm('Are you sure you want to delete this ad?')) {
      return;
    }

    this.deleting = true;
    this.adsApi.deleteAd(this.ad.id).subscribe({
      next: () => {
        this.router.navigate(['/ads']);
      },
      error: (err) => {
        this.error = err.userMessage || 'Failed to delete ad';
        this.deleting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/ads']);
  }
}

