# Ads Board - Angular Client

A Single Page Application (SPA) built with Angular 17 for managing advertisements (ads) with full CRUD operations, search, filtering, and pagination.

## Architecture

This project follows **Single Responsibility Principle (SRP)** and **Separation of Concerns (SoC)**:

- **Single API Access Point**: All HTTP communications go through `api-client.service.ts` - no direct `HttpClient` usage elsewhere
- **Domain Services**: `ads-api.service.ts` wraps the API client for domain-specific operations
- **Feature-based Structure**: Components organized by features (ads) with shared components for reusability
- **Standalone Components**: Angular 17 standalone components with lazy loading

## Project Structure

```
/client
  /src
    /app
      /core
        /services
          api-client.service.ts      # Single HTTP access point
          ads-api.service.ts         # Domain service for ads
        /models
          ad.model.ts                # TypeScript interfaces
        /interceptors
          error.interceptor.ts       # Error normalization
          loading.interceptor.ts     # Global loading state
        /config
          environment.ts             # Environment config access
      /features
        /ads
          ads-list/                  # List with search/filter/pagination
          ads-form/                  # Create/Edit form
          ads-details/               # Single ad view
      /shared
        /components
          search-bar/                # Reusable search component
      app-routing.ts                 # Route configuration
      app.component.ts               # Root component
  /environments
    environment.ts                   # Development config
    environment.prod.ts              # Production config
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI 17

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
ng serve
# or
npm start
```

The application will be available at `http://localhost:4200`

## Environment Configuration

### Development (`environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000/api'
};
```

### Production (`environments/environment.prod.ts`)
```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:5000/api'  // Update with your production API URL
};
```

**Important**: Update `apiBaseUrl` in both files to match your backend server URL.

## Connecting to Backend Server

1. Ensure your backend server is running (default: `http://localhost:5000`)
2. Update `apiBaseUrl` in environment files if your server uses a different port/URL
3. The API client expects the following endpoints:
   - `GET /api/ads` - List ads (with query parameters)
   - `GET /api/ads/:id` - Get single ad
   - `POST /api/ads` - Create ad
   - `PUT /api/ads/:id` - Update ad
   - `DELETE /api/ads/:id` - Delete ad

## Features

### Ads List (`/ads`)
- Search by text query
- Filter by category, price range, location
- Sort by date, price, or title
- Pagination support
- Empty and error states

### Create Ad (`/ads/new`)
- Form validation:
  - Title: 1-80 characters (required)
  - Description: 1-2000 characters (required)
  - Price: >= 0 (optional)
  - Contact: Name required, phone or email required
  - Location: If address provided, lat/lng required

### Edit Ad (`/ads/:id/edit`)
- Same form as create, pre-filled with existing data
- Updates existing ad

### Ad Details (`/ads/:id`)
- Full ad information display
- Edit and delete actions
- Navigation back to list

## Validation Rules

- **Title**: Required, 1-80 characters
- **Description**: Required, 1-2000 characters
- **Price**: Optional, must be >= 0
- **Contact Name**: Required
- **Contact Phone/Email**: At least one required
- **Location**: If address is provided, both latitude and longitude are required

## Architecture Principles

### Single Responsibility Principle (SRP)
- `ApiClientService`: Only handles HTTP communication
- `AdsApiService`: Only handles ads domain logic
- Components: Focus on UI and user interaction

### Separation of Concerns (SoC)
- Models: Data structures
- Services: Business logic
- Components: Presentation
- Interceptors: Cross-cutting concerns (errors, loading)

### Single API Access Point
- **CRITICAL**: All HTTP calls must go through `api-client.service.ts`
- No component or service should inject `HttpClient` directly
- This ensures consistent error handling, headers, and base URL management

## Error Handling

- Errors are normalized through `error.interceptor.ts`
- Server errors (ProblemDetails format) are converted to user-friendly messages
- Error states are displayed in UI components

## Loading States

- Global loading indicator managed by `loading.interceptor.ts`
- Component-level loading states for better UX

## Accessibility

- ARIA labels on interactive elements
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly

## Build

Build for production:
```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

## Testing

Run unit tests:
```bash
ng test
```

## Code Style

- TypeScript strict mode enabled
- Standalone components (Angular 17)
- Reactive Forms for form handling
- RxJS for reactive programming

## License

This project is part of an ads board application.

