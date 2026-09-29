import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
    AbstractConsentHandler,
    BeslistConsentType,
    ConsentStatusData,
    ConsentTypeMapping,
} from '../../ts/ConsentHandler/abstract.consent-handler';
import { ConsentProviderAdapter } from '../../ts/ConsentHandler/consent-provider-adapter';

/**
 * A consent handler with no browser behind it. updateConsent() is protected, so the stub exposes
 * it: emitting before the adapter subscribes is how a test sets the state it starts from.
 */
class StubConsentHandler extends AbstractConsentHandler {
    public emitConsent(consentData: ConsentStatusData): void {
        this.updateConsent(consentData);
    }

    public initializeConsentUpdateListener(): void {
    }

    protected getInitialConsent(): ConsentStatusData {
        return {};
    }

    protected getConsentHandlerName(): string {
        return 'stub';
    }

    protected getConsentTypeMapping(): ConsentTypeMapping<any> {
        return {} as ConsentTypeMapping<any>;
    }

    protected getCookieNameMapping(): ConsentTypeMapping<string | undefined> {
        return {} as ConsentTypeMapping<string | undefined>;
    }

    protected parseConsentCookieValue(
        _consentType: BeslistConsentType,
        _cookieValue: string,
    ): boolean | undefined {
        return undefined;
    }
}

describe('ConsentProviderAdapter', () => {
    it('reports the consent already held when it is constructed', () => {
        const handler = new StubConsentHandler();
        handler.emitConsent({ marketing: 'granted' });

        assert.equal(new ConsentProviderAdapter(handler, ['marketing']).isGranted(), true);
    });

    it('withholds consent that was denied', () => {
        const handler = new StubConsentHandler();
        handler.emitConsent({ marketing: 'denied' });

        assert.equal(new ConsentProviderAdapter(handler, ['marketing']).isGranted(), false);
    });

    it('requires every configured type, not just one of them', () => {
        const handler = new StubConsentHandler();
        handler.emitConsent({ marketing: 'granted', analytics: 'denied' });

        assert.equal(new ConsentProviderAdapter(handler, ['marketing', 'analytics']).isGranted(), false);
    });

    it('treats a type the platform never reported as not granted', () => {
        const handler = new StubConsentHandler();
        handler.emitConsent({ marketing: 'granted' });

        assert.equal(new ConsentProviderAdapter(handler, ['marketing', 'functional']).isGranted(), false);
    });

    it('notifies listeners when consent is granted later', () => {
        const handler = new StubConsentHandler();
        const adapter = new ConsentProviderAdapter(handler, ['marketing']);
        const seen: boolean[] = [];
        adapter.onConsentChange((granted) => seen.push(granted));

        handler.emitConsent({ marketing: 'granted' });

        assert.deepEqual(seen, [true]);
        assert.equal(adapter.isGranted(), true);
    });

    it('stays quiet when the platform re-reports the same answer', () => {
        const handler = new StubConsentHandler();
        handler.emitConsent({ marketing: 'granted' });
        const adapter = new ConsentProviderAdapter(handler, ['marketing']);
        const seen: boolean[] = [];
        adapter.onConsentChange((granted) => seen.push(granted));

        handler.emitConsent({ marketing: 'granted' });

        assert.deepEqual(seen, []);
    });

    it('stops notifying once the returned unsubscribe is called', () => {
        const handler = new StubConsentHandler();
        const adapter = new ConsentProviderAdapter(handler, ['marketing']);
        const seen: boolean[] = [];
        const unsubscribe = adapter.onConsentChange((granted) => seen.push(granted));

        unsubscribe();
        handler.emitConsent({ marketing: 'granted' });

        assert.deepEqual(seen, []);
    });
});
