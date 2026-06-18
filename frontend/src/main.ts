import { enableProdMode, ErrorHandler, inject, importProvidersFrom, provideAppInitializer } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './app/core/interceptors/jwt.interceptor';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { catchError, firstValueFrom, of } from 'rxjs';
import { bootstrapApplication } from '@angular/platform-browser';
import { NZ_I18N, vi_VN } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';
import * as Sentry from '@sentry/angular';
import { init, browserTracingIntegration } from '@sentry/angular';
import { NzIconModule } from 'ng-zorro-antd/icon';
import {
  SearchOutline, RocketOutline, ApartmentOutline, CalendarOutline, PlusOutline,
  LogoutOutline, QuestionCircleFill, EditOutline, CopyOutline, DeleteOutline,
  ArrowLeftOutline, RobotOutline, SaveOutline, ExclamationCircleOutline,
  BorderOuterOutline, CloseOutline, NodeIndexOutline, CheckCircleOutline,
  ArrowRightOutline, ReloadOutline, ForkOutline, WarningOutline, FlagOutline,
  BarChartOutline, ClockCircleOutline, SwapOutline, StopOutline, AppstoreOutline,
  UnorderedListOutline, PlusCircleOutline, RightCircleOutline, TagOutline,
  TeamOutline, RollbackOutline, BgColorsOutline,
  // Organization feature icons
  BankOutline, DownOutline, CheckOutline, CaretDownOutline, CaretRightOutline,
  CrownOutline, UserAddOutline, ProjectOutline, CheckCircleFill,
  UserOutline, SettingOutline, InfoCircleOutline,
  // Portfolio & Program Management icons
  FolderOutline, SafetyCertificateOutline, BulbOutline, ArrowUpOutline, ArrowDownOutline,
  MinusOutline,
  // Resource & Capacity Management icons
  TrophyOutline, UserDeleteOutline,
} from '@ant-design/icons-angular/icons';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { QuillModule } from 'ngx-quill';
import { NG_ENTITY_SERVICE_CONFIG } from '@datorama/akita-ng-entity-service';

import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';


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

registerLocaleData(vi);

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(appRoutes),
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi()),
        importProvidersFrom(
            NzIconModule.forRoot([
              SearchOutline, RocketOutline, ApartmentOutline, CalendarOutline, PlusOutline,
              LogoutOutline, QuestionCircleFill, EditOutline, CopyOutline, DeleteOutline,
              ArrowLeftOutline, RobotOutline, SaveOutline, ExclamationCircleOutline,
              BorderOuterOutline, CloseOutline, NodeIndexOutline, CheckCircleOutline,
              ArrowRightOutline, ReloadOutline, ForkOutline, WarningOutline, FlagOutline,
              BarChartOutline, ClockCircleOutline, SwapOutline, StopOutline, AppstoreOutline,
              UnorderedListOutline, PlusCircleOutline, RightCircleOutline, TagOutline,
              TeamOutline, RollbackOutline, BgColorsOutline,
              BankOutline, DownOutline, CheckOutline, CaretDownOutline, CaretRightOutline,
              CrownOutline, UserAddOutline, ProjectOutline, CheckCircleFill,
              UserOutline, SettingOutline, InfoCircleOutline,
              FolderOutline, SafetyCertificateOutline, BulbOutline, ArrowUpOutline, ArrowDownOutline,
              MinusOutline,
              TrophyOutline, UserDeleteOutline,
            ]),
            environment.production ? [] : AkitaNgDevtools,
            AkitaNgRouterStoreModule,
            QuillModule.forRoot()
        ),
        provideTranslateService(),
        ...provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
        provideAppInitializer(() => {
            const translate = inject(TranslateService);
            const lang = localStorage.getItem('language') || 'vi';
            return firstValueFrom(translate.use(lang).pipe(catchError(() => of(null))));
        }),
        {
            provide: NG_ENTITY_SERVICE_CONFIG,
            useValue: { baseUrl: 'https://jsonplaceholder.typicode.com' }
        },
        { provide: NZ_I18N, useValue: vi_VN },
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
