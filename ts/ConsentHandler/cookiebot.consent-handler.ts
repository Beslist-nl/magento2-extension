import {
    AbstractConsentHandler,
    BeslistConsentType, ConsentStatusData,
    ConsentTypeMapping
} from './abstract.consent-handler';

export type CookiebotConsentType = 'necessary' | 'preferences' | 'statistics' | 'marketing';

declare const window: {
    addEventListener: (...args: any[]) => any;
}

export class CookiebotConsentHandler extends AbstractConsentHandler {
    public static consentHandlerName = 'cookiebot';
    public static consentTypeMapping: ConsentTypeMapping<CookiebotConsentType> = {
        necessary: 'necessary',
        functional: 'preferences',
        analytics: 'statistics',
        performance: 'preferences',
        marketing: 'marketing',
    }
    public static cookieNameMapping: ConsentTypeMapping<string | undefined> = {
        necessary: 'CookieConsent',
        functional: 'CookieConsent',
        analytics: 'CookieConsent',
        performance: 'CookieConsent',
        marketing: 'CookieConsent',
    }

    protected getConsentHandlerName(): string {
        return CookiebotConsentHandler.consentHandlerName;
    };

    protected getConsentTypeMapping(): ConsentTypeMapping<CookiebotConsentType> {
        return CookiebotConsentHandler.consentTypeMapping;
    }

    protected getCookieNameMapping(): ConsentTypeMapping<string | undefined> {
        return CookiebotConsentHandler.cookieNameMapping;
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
        window.addEventListener('CookiebotOnConsentReady', () => {
            console.log('CookiebotOnConsentReady');
            if (this.getConsentFromCookie('marketing') === true) {
                this.updateConsent({
                    marketing: 'granted',
                });
            } else if (this.getConsentFromCookie('marketing') === false) {
                this.updateConsent({
                    marketing: 'denied',
                });
            }
        });
    }

    protected parseConsentCookieValue(consentType: BeslistConsentType, cookieValue: string): boolean {
        return cookieValue.includes(this.mapConsentType(consentType) + ':true');
    }
}
