import { from, Observable } from 'rxjs';
import { BeslistHandlerConfigurationInterface } from './beslist-handler-configuration.interface';
import { CookieHandler } from './cookie-handler';
import { EventData } from './event-data.interface';

export class EventHandler {
    private readonly configuration: BeslistHandlerConfigurationInterface;
    private known_advertising_params = [
        '__hsfp',
        '__hssc',
        '__hstc',
        '__s',
        '_hsenc',
        '_openstat',
        'dclid',
        'fbclid',
        'gclid',
        'hsCtaTracking',
        'mc_eid',
        'mkt_tok',
        'ml_subscriber',
        'ml_subscriber_hash',
        'msclkid',
        'oly_anon_id',
        'oly_enc_id',
        'rb_clickid',
        's_cid',
        'vero_conv',
        'vero_id',
        'wickedid',
        'yclid'
    ];

    constructor(configuration: BeslistHandlerConfigurationInterface) {
        this.configuration = configuration;
    }

    public sendSessionStart(): Observable<number> {
        return from(new Promise<number>((resolve, reject) => {
            const eventData: EventData = {
                eventName: 'session_start',
                screenHeight: screen.height || undefined,
                screenWidth: screen.width || undefined,
                location: {
                    protocol: window.location.protocol || '',
                    host: window.location.host || '',
                    path: window.location.pathname || '',
                    query: window.location.search || '',
                    hash: window.location.hash || '',
                    referrer: document.referrer || '',
                },
                context: {
                    sessionStartReasons: this.getSessionStartReasons().join('|'),
                },
            };

            const xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    } else {
                        reject(xmlHttpRequest.status);
                    }
                }
            }
            xmlHttpRequest.open('POST', this.configuration.eventApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send(JSON.stringify(eventData));
        }));
    }

    public sendQueuedEvents(): Observable<number> {
        return from(new Promise<number>((resolve, reject) => {
            const xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    } else {
                        reject(xmlHttpRequest.status);
                    }
                }
            }
            xmlHttpRequest.open('POST', this.configuration.queuedEventsApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send();
        }));
    }

    private hasSessionIDCookie(): boolean {
        return CookieHandler.getCookie(this.configuration.sessionIDCookieName) !== undefined;
    }

    public requiresSessionStart(): boolean {
        return this.getSessionStartReasons().length >= 1;
    }

    private getSessionStartReasons(): string[] {
        const sessionStartReasons: string[] = [];

        if (!this.hasSessionIDCookie()) {
            sessionStartReasons.push('no session id');
        }

        if (this.isPageReload()) {
            return sessionStartReasons;
        }

        if (document.referrer !== '') {
            const referrerHost = new URL(document.referrer).hostname.split('.').slice(-2).join('.');
            const currentHost = location.hostname.split('.').slice(-2).join('.');
            if (referrerHost !== currentHost) {
                sessionStartReasons.push('new referrer');
            }
        } else {
            sessionStartReasons.push('new referrer');
        }

        if (window.location.search.indexOf('utm_') > -1) {
            sessionStartReasons.push('utm detected');
        }

        if (window.location.search.indexOf('clientUuid') > -1) {
            sessionStartReasons.push('new uuid detected');
        } else if (window.location.search.indexOf('bl3nlclid') > -1) {
            sessionStartReasons.push('new bl3nlclid detected');
        }

        if (this.known_advertising_params.some(param => window.location.search.includes(param)) && window.location.search.indexOf('_gl') === -1) {
            sessionStartReasons.push('advertising param detected');
        }

        return sessionStartReasons;
    }

    private isPageReload(): boolean {
        // @ts-ignore - See: https://github.com/microsoft/TypeScript/issues/58644
        return (window.performance.navigation && window.performance.navigation.type === 1) || performance.getEntriesByType('navigation').some(entry => entry.type === 'reload');
    }
}
