import { BeslistHandlerConfigurationInterface } from './beslist-handler-configuration.interface';
import { AbstractConsentHandler, ConsentStatusData } from './ConsentHandler/abstract.consent-handler';
import { CookieYesConsentHandler } from './ConsentHandler/cookie-yes.consent-handler';
import { CookiebotConsentHandler } from './ConsentHandler/cookiebot.consent-handler';
import { CustomConsentHandler } from './ConsentHandler/custom.consent-handler';
import { CookieHandler } from './cookie-handler';
import { EventHandler } from './event-handler';

declare var window: any;

class BeslistHandler {
    private readonly configuration: BeslistHandlerConfigurationInterface;
    private eventHandler: EventHandler;
    private readonly consentHandler?: AbstractConsentHandler;
    private hasSentSessionStart = false;

    constructor(configuration: BeslistHandlerConfigurationInterface) {
        this.configuration = configuration;
        console.log(this.configuration);

        if (this.configuration.areCustomTriggersEnabled) {
            this.addCustomConsentMethods();
        }

        this.eventHandler = new EventHandler(this.configuration);

        if (!this.configuration.isTrackingEnabled) {
            return;
        }

        this.consentHandler = this.getActiveConsentHandler();

        if (!this.consentHandler) {
            console.info('Beslist Tracking: No ConsentHandler initialized.');
        } else {
            this.consentHandler.currentConsent.subscribe((consentData) => this.handleConsentUpdateEvent(consentData));
            this.consentHandler.initialize();
        }
    }

    public addCustomConsentMethods(): void {
        window.beslist_tracking_js_consent = window.beslist_tracking_js_consent || [];

        const consentFromAction = this.configuration.consentFromAction;
        if (consentFromAction) {
            window.beslist_tracking_js_consent.push(consentFromAction);
        }

        window.beslist_tracking_update_consent = (value: any) => {
            window.beslist_tracking_js_consent.push(value);
            document.dispatchEvent(new CustomEvent('beslist_tracking_js_consent', {detail: value}));
        }
    }

    public handleConsentUpdateEvent(consentData: { handler?: string, consent: ConsentStatusData }): void {
        CookieHandler.setCookie(this.configuration.consentCookieName, JSON.stringify(consentData), 365 * 24 * 60 * 60);

        if (this.configuration.hasQueuedEvents && this.isConsentOfTypesGranted(this.configuration.requiredConsentTypes, consentData.consent)) {
            this.eventHandler.sendQueuedEvents().then(() => {
                this.configuration.hasQueuedEvents = false;
            });
        }

        if (!this.hasSentSessionStart && this.eventHandler.requiresSessionStart()) {
            this.eventHandler.sendSessionStart().then(() => {
                this.hasSentSessionStart = true;

                if (!this.isConsentOfTypesGranted(this.configuration.requiredConsentTypes, consentData.consent)) {
                    this.configuration.hasQueuedEvents = true;
                }
            });
        }
    }

    private isConsentOfTypesGranted(consentTypes: string[], consentStatusData: ConsentStatusData): boolean {
        return consentTypes.every((consentType: string) => {
            return this.isConsentOfTypeGranted(consentType, consentStatusData);
        });
    }

    private isConsentOfTypeGranted(consentType: string, consentStatusData: ConsentStatusData): boolean {
        switch (true) {
            case consentType === 'necessary':
                return !!(consentStatusData.necessary && consentStatusData.necessary === 'granted');

            case consentType === 'functional':
                return !!(consentStatusData.functional && consentStatusData.functional === 'granted');

            case consentType === 'analytics':
                return !!(consentStatusData.analytics && consentStatusData.analytics === 'granted');

            case consentType === 'performance':
                return !!(consentStatusData.performance && consentStatusData.performance === 'granted');

            case consentType === 'marketing':
                return !!(consentStatusData.marketing && consentStatusData.marketing === 'granted');

            default:
                throw new Error('ConsentType "' + consentType + '" not implemented.');
        }
    }

    private getActiveConsentHandler(): AbstractConsentHandler | undefined {
        if (this.configuration.activeConsentHandlerName === CustomConsentHandler.consentHandlerName) {
            return new CustomConsentHandler();
        }

        if (this.configuration.activeConsentHandlerName === CookiebotConsentHandler.consentHandlerName) {
            return new CookiebotConsentHandler();
        }

        if (this.configuration.activeConsentHandlerName === CookieYesConsentHandler.consentHandlerName) {
            return new CookieYesConsentHandler();
        }

        return undefined;
    }
}

window.addEventListener('beslistTrackingConfigReady', (event: Event) => {
    const customEvent = event as CustomEvent;  // type assertion here
    const configData = customEvent.detail;

    new BeslistHandler(configData);
});
