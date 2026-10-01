import { BeslistTracker, ConsentState, resolveConfiguration } from '@beslist-nl/beslist-tracking-sdk';
import { BeslistHandlerConfigurationInterface } from './beslist-handler-configuration.interface';
import { AbstractConsentHandler, ConsentData, ConsentStatusData } from './ConsentHandler/abstract.consent-handler';
import { ConsentProviderAdapter } from './ConsentHandler/consent-provider-adapter';
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
    private consentProvider?: ConsentProviderAdapter;
    private lastConsent?: ConsentStatusData;
    private hasSentSessionStart = false;

    constructor(configuration: BeslistHandlerConfigurationInterface) {
        this.configuration = configuration;

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
            this.consentProvider = new ConsentProviderAdapter(
                this.consentHandler,
                this.configuration.requiredConsentTypes
            );
            this.consentHandler.subscribe((consentData) => this.handleConsentUpdateEvent(consentData));
            this.consentHandler.initialize();
        }

        this.sendCookielessPings();
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

    public handleConsentUpdateEvent(consentData: ConsentData): void {
        this.lastConsent = consentData.consent;

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

    private sendCookielessPings(): void {
        if (!this.configuration.cookielessPingsEnabled || !this.configuration.advertiserID) {
            return;
        }

        let tracker: BeslistTracker;

        try {
            tracker = new BeslistTracker(
                resolveConfiguration(this.configuration.advertiserID, {
                    implementationType: 'magento_plugin-' + this.configuration.pluginVersion,
                    cookielessPingEnabled: true,
                    captureMidSessionReferrer: true,
                }),
                this.consentProvider ? {consent: this.consentProvider} : {}
            );
        } catch (error) {
            console.error('Beslist Tracking: could not start the cookieless ping tracker.', error);
            return;
        }

        const consent = this.getConsentState();

        tracker.sendSessionStartPing(consent).catch((error) => console.error(error));

        const conversionData = this.configuration.conversionData;
        if (conversionData) {
            tracker.sendConversionPing(conversionData, consent).catch((error) => console.error(error));
        }
    }

    /**
     * The visitor's consent as the ping reports it, or undefined when no platform answered.
     */
    private getConsentState(): ConsentState | undefined {
        if (!this.lastConsent) {
            return undefined;
        }

        return {
            functional: this.lastConsent.functional === 'granted',
            analytics: this.lastConsent.analytics === 'granted',
            marketing: this.lastConsent.marketing === 'granted',
        };
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
