import { BehaviorSubject, combineLatest, debounceTime, map, Observable } from 'rxjs';
import { CookieHandler } from '../cookie-handler';

export type BeslistConsentType = 'necessary' | 'functional' | 'analytics' | 'performance' | 'marketing';
export type ConsentTypeMapping<T> = {
    necessary: T,
    functional: T,
    analytics: T,
    performance: T,
    marketing: T,
}
export type ConsentStatus = 'granted' | 'denied';

export interface ConsentStatusData {
    necessary?: ConsentStatus,
    functional?: ConsentStatus,
    analytics?: ConsentStatus,
    performance?: ConsentStatus,
    marketing?: ConsentStatus,
}

export abstract class AbstractConsentHandler {
    public currentConsent: Observable<{
        consent: ConsentStatusData,
        handler: string,
    }>;
    public currentNecessaryConsent: BehaviorSubject<ConsentStatus>;
    public currentFunctionalConsent: BehaviorSubject<ConsentStatus>;
    public currentAnalyticsConsent: BehaviorSubject<ConsentStatus>;
    public currentPerformanceConsent: BehaviorSubject<ConsentStatus>;
    public currentMarketingConsent: BehaviorSubject<ConsentStatus>;

    constructor() {
        const initialConsent = this.getInitialConsent();

        this.currentNecessaryConsent = new BehaviorSubject<ConsentStatus>(initialConsent.necessary || 'denied');
        this.currentFunctionalConsent = new BehaviorSubject<ConsentStatus>(initialConsent.functional || 'denied');
        this.currentAnalyticsConsent = new BehaviorSubject<ConsentStatus>(initialConsent.analytics || 'denied');
        this.currentPerformanceConsent = new BehaviorSubject<ConsentStatus>(initialConsent.performance || 'denied');
        this.currentMarketingConsent = new BehaviorSubject<ConsentStatus>(initialConsent.marketing || 'denied');

        this.currentConsent = combineLatest([
            this.currentNecessaryConsent,
            this.currentFunctionalConsent,
            this.currentAnalyticsConsent,
            this.currentPerformanceConsent,
            this.currentMarketingConsent,
        ]).pipe(
            debounceTime(1),
            map(([necessary, functional, analytics, performance, marketing]) => {
                return {
                    consent: {
                        necessary: necessary,
                        functional: functional,
                        analytics: analytics,
                        performance: performance,
                        marketing: marketing,
                    },
                    handler: this.getConsentHandlerName(),
                };
            })
        );
    }

    public initialize(): void {
        this.initializeConsentUpdateListener();
    }

    public abstract initializeConsentUpdateListener(): void;

    protected abstract getInitialConsent(): ConsentStatusData;

    protected abstract getConsentHandlerName(): string;

    protected abstract getConsentTypeMapping(): ConsentTypeMapping<any>;

    protected abstract getCookieNameMapping(): ConsentTypeMapping<string | undefined>;

    protected abstract parseConsentCookieValue(consentType: BeslistConsentType, cookieValue: string): boolean | undefined;

    protected updateConsent(consentData: ConsentStatusData): void {
        if (consentData.necessary) {
            this.currentNecessaryConsent.next(consentData.necessary);
        }

        if (consentData.functional) {
            this.currentFunctionalConsent.next(consentData.functional);
        }

        if (consentData.analytics) {
            this.currentAnalyticsConsent.next(consentData.analytics);
        }

        if (consentData.performance) {
            this.currentPerformanceConsent.next(consentData.performance);
        }

        if (consentData.marketing) {
            this.currentMarketingConsent.next(consentData.marketing);
        }
    }

    protected mapConsentType(consentType: BeslistConsentType): string {
        return this.getConsentTypeMapping()[consentType];
    }

    protected mapCookieName(consentType: BeslistConsentType): string | undefined {
        return this.getCookieNameMapping()[consentType];
    }

    protected getConsentFromCookie(consentType: BeslistConsentType): boolean | undefined {
        const cookieName = this.mapCookieName(consentType);

        if (!cookieName) {
            return undefined;
        }

        const consentCookieValue = CookieHandler.getCookie(cookieName);

        if (!consentCookieValue) {
            return undefined;
        }

        return this.parseConsentCookieValue(consentType, consentCookieValue);
    }
}



