import { Component, EventEmitter, Output, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Reusable search bar component
 * Follows SRP by focusing solely on search input UI
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  placeholder = input<string>('Search...');
  debounceTime = input<number>(300);

  @Output() searchChange = new EventEmitter<string>();

  searchControl = new FormControl('');

  constructor() {
    // Emit search value on changes (with debounce handled by parent if needed)
    this.searchControl.valueChanges.subscribe(value => {
      this.searchChange.emit(value || '');
    });
  }
}

