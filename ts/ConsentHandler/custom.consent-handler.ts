import {
    AbstractConsentHandler,
    BeslistConsentType, ConsentStatusData,
    ConsentTypeMapping
} from './abstract.consent-handler';

declare var window: {
    beslist_tracking_js_consent?: any,
    beslist_tracking_update_consent: (...args: any[]) => any,
}

export class CustomConsentHandler extends AbstractConsentHandler {
    public static consentHandlerName = 'custom';
    public static consentTypeMapping: ConsentTypeMapping<BeslistConsentType> = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'marketing',
    }
    public static cookieNameMapping: ConsentTypeMapping<undefined> = {
        necessary: undefined,
        functional: undefined,
        analytics: undefined,
        performance: undefined,
        marketing: undefined,
    };

    protected getConsentHandlerName(): string {
        return CustomConsentHandler.consentHandlerName;
    };

    protected getConsentTypeMapping(): ConsentTypeMapping<BeslistConsentType | undefined> {
        return CustomConsentHandler.consentTypeMapping;
    }

    protected getCookieNameMapping(): ConsentTypeMapping<undefined> {
        return CustomConsentHandler.cookieNameMapping;
    }

    protected getInitialConsent(): ConsentStatusData {
        const defaultConsent: ConsentStatusData = {
            necessary: 'denied',
            functional: 'denied',
            analytics: 'denied',
            performance: 'denied',
            marketing: 'denied',
        }

        if (window.beslist_tracking_js_consent) {
            return window.beslist_tracking_js_consent.reduce((accumulator: ConsentStatusData, current: ConsentStatusData) => {
                return {...accumulator, ...current};
            }, defaultConsent);
        }

        return defaultConsent
    }

    public initializeConsentUpdateListener(): void {
        document.addEventListener('beslist_tracking_js_consent', (event: any) => {
            const consentStatusData: ConsentStatusData = {};

            if (event.detail.hasOwnProperty(this.mapConsentType('necessary'))) {
                consentStatusData.necessary = event.detail[this.mapConsentType('necessary')] === 'granted' ? 'granted' : 'denied';
            }

            if (event.detail.hasOwnProperty(this.mapConsentType('functional'))) {
                consentStatusData.functional = event.detail[this.mapConsentType('functional')] === 'granted' ? 'granted' : 'denied';
            }

            if (event.detail.hasOwnProperty(this.mapConsentType('analytics'))) {
                consentStatusData.analytics = event.detail[this.mapConsentType('analytics')] === 'granted' ? 'granted' : 'denied';
            }

            if (event.detail.hasOwnProperty(this.mapConsentType('performance'))) {
                consentStatusData.performance = event.detail[this.mapConsentType('performance')] === 'granted' ? 'granted' : 'denied';
            }

            if (event.detail.hasOwnProperty(this.mapConsentType('marketing'))) {
                consentStatusData.marketing = event.detail[this.mapConsentType('marketing')] === 'granted' ? 'granted' : 'denied';
            }

            this.updateConsent(consentStatusData);
        });
    }

    protected parseConsentCookieValue(consentType: BeslistConsentType, cookieValue: string): boolean | undefined {
        return undefined;
    }
}
