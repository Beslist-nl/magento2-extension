import {
    AbstractConsentHandler,
    BeslistConsentType, ConsentStatusData,
    ConsentTypeMapping
} from './abstract.consent-handler';

export type CookieYesConsentType = 'necessary' | 'functional' | 'analytics' | 'performance' | 'advertisement';

export class CookieYesConsentHandler extends AbstractConsentHandler {
    public static consentHandlerName = 'cookie-law-info';
    public static consentTypeMapping: ConsentTypeMapping<CookieYesConsentType> = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'advertisement',
    }
    public static cookieNameMapping: ConsentTypeMapping<string | undefined> = {
        necessary: 'cookieyes-consent',
        functional: 'cookieyes-consent',
        analytics: 'cookieyes-consent',
        performance: 'cookieyes-consent',
        marketing: 'cookieyes-consent',
    }

    protected getConsentHandlerName(): string {
        return CookieYesConsentHandler.consentHandlerName;
    };

    protected getConsentTypeMapping(): ConsentTypeMapping<CookieYesConsentType> {
        return CookieYesConsentHandler.consentTypeMapping;
    }

    protected getCookieNameMapping(): ConsentTypeMapping<string | undefined> {
        return CookieYesConsentHandler.cookieNameMapping;
    }

    protected getInitialConsent(): ConsentStatusData {
        return {
            necessary: this.getConsentFromCookie('necessary') === true ? 'granted' : 'denied',
            functional: this.getConsentFromCookie('functional') === true ? 'granted' : 'denied',
            analytics: this.getConsentFromCookie('analytics') === true ? 'granted' : 'denied',
            performance: this.getConsentFromCookie('performance') === true ? 'granted' : 'denied',
            marketing: this.getConsentFromCookie('marketing') === true ? 'granted' : 'denied',
        };
    }

    public initializeConsentUpdateListener(): void {
        document.addEventListener('cookieyes_consent_update', (event: any) => {
            this.updateConsent({
                necessary: event.detail.accepted.includes(this.mapConsentType('necessary')) ? 'granted' : 'denied',
                functional: event.detail.accepted.includes(this.mapConsentType('functional')) ? 'granted' : 'denied',
                analytics: event.detail.accepted.includes(this.mapConsentType('analytics')) ? 'granted' : 'denied',
                performance: event.detail.accepted.includes(this.mapConsentType('performance')) ? 'granted' : 'denied',
                marketing: event.detail.accepted.includes(this.mapConsentType('marketing')) ? 'granted' : 'denied',
            });
        });
    }

    protected parseConsentCookieValue(consentType: BeslistConsentType, cookieValue: string): boolean {
        return cookieValue.includes(this.mapConsentType(consentType) + ':yes');
    }
}