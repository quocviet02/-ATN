import { enableProdMode, ErrorHandler, inject, importProvidersFrom, provideAppInitializer } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { catchError, of } from 'rxjs';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { init, browserTracingIntegration } from '@sentry/angular';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { QuillModule } from 'ngx-quill';
import { NG_ENTITY_SERVICE_CONFIG } from '@datorama/akita-ng-entity-service';

import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';

function createTranslateLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

const initSentry = () => {
  init({
    dsn: 'https://b2af8332e38f486d910f06b79df66365@o495789.ingest.sentry.io/5569161',
    integrations: [
      browserTracingIntegration(),
    ],
    tracePropagationTargets: ['localhost', 'jira.trungk18.com'],
    tracesSampleRate: 1.0
  });
};

if (environment.production) {
  enableProdMode();
  initSentry();
}

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(appRoutes),
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi()),
        importProvidersFrom(
            NzIconModule.forRoot([]),
            environment.production ? [] : AkitaNgDevtools,
            AkitaNgRouterStoreModule,
            QuillModule.forRoot()
        ),
        provideTranslateService({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient]
            }
        }),
        provideAppInitializer(() => {
            const translate = inject(TranslateService);
            const lang = localStorage.getItem('language') || 'vi';
            return translate.use(lang).pipe(catchError(() => of(null)));
        }),
        {
            provide: NG_ENTITY_SERVICE_CONFIG,
            useValue: { baseUrl: 'https://jsonplaceholder.typicode.com' }
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: JwtInterceptor,
            multi: true
        },
        {
            provide: ErrorHandler,
            useValue: Sentry.createErrorHandler()
        },
        {
            provide: Sentry.TraceService,
            deps: [Router],
        },
        provideAppInitializer(() => { inject(Sentry.TraceService); }),
    ]
})
  .catch((err) => console.error(err));
