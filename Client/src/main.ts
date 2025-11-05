import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app-routing';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { loadingInterceptor } from './app/core/interceptors/loading.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([errorInterceptor, loadingInterceptor])
    )
  ]
}).catch(err => console.error(err));

