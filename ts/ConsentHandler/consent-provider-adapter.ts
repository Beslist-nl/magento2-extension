import { ConsentProvider } from '@beslist-nl/beslist-tracking-sdk';
import { AbstractConsentHandler, ConsentStatusData } from './abstract.consent-handler';

/**
 * Adapts this plugin's AbstractConsentHandler to the SDK's ConsentProvider interface, so the
 * consent management platform the merchant already configured drives the SDK too.
 */
export class ConsentProviderAdapter implements ConsentProvider {
    private granted: boolean = false;
    private listeners: Set<(granted: boolean) => void> = new Set();

    constructor(
        consentHandler: AbstractConsentHandler,
        private readonly requiredConsentTypes: string[],
    ) {
        // subscribe() emits synchronously, so `granted` is accurate once this constructor returns.
        consentHandler.subscribe((consentData) => {
            const wasGranted = this.granted;
            this.granted = this.isConsentOfTypesGranted(consentData.consent);

            if (this.granted !== wasGranted) {
                this.listeners.forEach((callback) => callback(this.granted));
            }
        });
    }

    public isGranted(): boolean {
        return this.granted;
    }

    public onConsentChange(callback: (granted: boolean) => void): () => void {
        this.listeners.add(callback);

        return () => {
            this.listeners.delete(callback);
        };
    }

    private isConsentOfTypesGranted(consentStatusData: ConsentStatusData): boolean {
        return this.requiredConsentTypes.every((consentType) => {
            return consentStatusData[consentType as keyof ConsentStatusData] === 'granted';
        });
    }
}
