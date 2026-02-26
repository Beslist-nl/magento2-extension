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

export interface ConsentData {
    consent: ConsentStatusData;
    handler: string;
}

type ConsentListener = (data: ConsentData) => void;

export abstract class AbstractConsentHandler {
    public currentConsent: { subscribe: (listener: ConsentListener) => void };
    private consentValues: Required<ConsentStatusData>;
    private listeners: ConsentListener[] = [];

    constructor() {
        const initialConsent = this.getInitialConsent();

        this.consentValues = {
            necessary: initialConsent.necessary || 'denied',
            functional: initialConsent.functional || 'denied',
            analytics: initialConsent.analytics || 'denied',
            performance: initialConsent.performance || 'denied',
            marketing: initialConsent.marketing || 'denied',
        };

        this.currentConsent = {
            subscribe: (listener: ConsentListener) => {
                this.listeners.push(listener);
                this.emit();
            },
        };
    }

    private emit(): void {
        const data: ConsentData = {
            consent: {...this.consentValues},
            handler: this.getConsentHandlerName(),
        };
        this.listeners.forEach(listener => listener(data));
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
            this.consentValues.necessary = consentData.necessary;
        }

        if (consentData.functional) {
            this.consentValues.functional = consentData.functional;
        }

        if (consentData.analytics) {
            this.consentValues.analytics = consentData.analytics;
        }

        if (consentData.performance) {
            this.consentValues.performance = consentData.performance;
        }

        if (consentData.marketing) {
            this.consentValues.marketing = consentData.marketing;
        }

        this.emit();
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



