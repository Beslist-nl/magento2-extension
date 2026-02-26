/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./ts/cookie-handler.ts
var CookieHandler = /** @class */ (function () {
    function CookieHandler() {
    }
    CookieHandler.getCookie = function (name) {
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        for (var _i = 0, cookies_1 = cookies; _i < cookies_1.length; _i++) {
            var cookie = cookies_1[_i];
            var _a = cookie.split('='), cookieName = _a[0], rest = _a.slice(1);
            if (decodeURIComponent(cookieName) === name) {
                return decodeURIComponent(rest.join('='));
            }
        }
        return undefined;
    };
    CookieHandler.setCookie = function (name, value, seconds, path, domain, secure, sameSite) {
        if (path === void 0) { path = '/'; }
        if (domain === void 0) { domain = window.location.hostname.split(/\./).slice(-2).join('.'); }
        if (secure === void 0) { secure = 'secure'; }
        if (sameSite === void 0) { sameSite = 'lax'; }
        var expires = '';
        if (seconds) {
            var date = new Date();
            date.setTime(date.getTime() + (seconds * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + value + expires + ';path=' + path + ';domain=' + domain + ';' + secure + ';samesite=' + sameSite;
    };
    return CookieHandler;
}());


;// ./ts/ConsentHandler/abstract.consent-handler.ts
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var AbstractConsentHandler = /** @class */ (function () {
    function AbstractConsentHandler() {
        this.listeners = [];
        var initialConsent = this.getInitialConsent();
        this.consentValues = {
            necessary: initialConsent.necessary || 'denied',
            functional: initialConsent.functional || 'denied',
            analytics: initialConsent.analytics || 'denied',
            performance: initialConsent.performance || 'denied',
            marketing: initialConsent.marketing || 'denied',
        };
    }
    AbstractConsentHandler.prototype.subscribe = function (listener) {
        this.listeners.push(listener);
        this.emit();
    };
    AbstractConsentHandler.prototype.emit = function () {
        var data = {
            consent: __assign({}, this.consentValues),
            handler: this.getConsentHandlerName(),
        };
        this.listeners.forEach(function (listener) { return listener(data); });
    };
    AbstractConsentHandler.prototype.initialize = function () {
        this.initializeConsentUpdateListener();
    };
    AbstractConsentHandler.prototype.updateConsent = function (consentData) {
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
    };
    AbstractConsentHandler.prototype.mapConsentType = function (consentType) {
        return this.getConsentTypeMapping()[consentType];
    };
    AbstractConsentHandler.prototype.mapCookieName = function (consentType) {
        return this.getCookieNameMapping()[consentType];
    };
    AbstractConsentHandler.prototype.getConsentFromCookie = function (consentType) {
        var cookieName = this.mapCookieName(consentType);
        if (!cookieName) {
            return undefined;
        }
        var consentCookieValue = CookieHandler.getCookie(cookieName);
        if (!consentCookieValue) {
            return undefined;
        }
        return this.parseConsentCookieValue(consentType, consentCookieValue);
    };
    return AbstractConsentHandler;
}());


;// ./ts/ConsentHandler/cookie-yes.consent-handler.ts
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var CookieYesConsentHandler = /** @class */ (function (_super) {
    __extends(CookieYesConsentHandler, _super);
    function CookieYesConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CookieYesConsentHandler.prototype.getConsentHandlerName = function () {
        return CookieYesConsentHandler.consentHandlerName;
    };
    ;
    CookieYesConsentHandler.prototype.getConsentTypeMapping = function () {
        return CookieYesConsentHandler.consentTypeMapping;
    };
    CookieYesConsentHandler.prototype.getCookieNameMapping = function () {
        return CookieYesConsentHandler.cookieNameMapping;
    };
    CookieYesConsentHandler.prototype.getInitialConsent = function () {
        return {
            necessary: this.getConsentFromCookie('necessary') === true ? 'granted' : 'denied',
            functional: this.getConsentFromCookie('functional') === true ? 'granted' : 'denied',
            analytics: this.getConsentFromCookie('analytics') === true ? 'granted' : 'denied',
            performance: this.getConsentFromCookie('performance') === true ? 'granted' : 'denied',
            marketing: this.getConsentFromCookie('marketing') === true ? 'granted' : 'denied',
        };
    };
    CookieYesConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        document.addEventListener('cookieyes_consent_update', function (event) {
            _this.updateConsent({
                necessary: event.detail.accepted.includes(_this.mapConsentType('necessary')) ? 'granted' : 'denied',
                functional: event.detail.accepted.includes(_this.mapConsentType('functional')) ? 'granted' : 'denied',
                analytics: event.detail.accepted.includes(_this.mapConsentType('analytics')) ? 'granted' : 'denied',
                performance: event.detail.accepted.includes(_this.mapConsentType('performance')) ? 'granted' : 'denied',
                marketing: event.detail.accepted.includes(_this.mapConsentType('marketing')) ? 'granted' : 'denied',
            });
        });
    };
    CookieYesConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return cookieValue.includes(this.mapConsentType(consentType) + ':yes');
    };
    CookieYesConsentHandler.consentHandlerName = 'cookie-law-info';
    CookieYesConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'advertisement',
    };
    CookieYesConsentHandler.cookieNameMapping = {
        necessary: 'cookieyes-consent',
        functional: 'cookieyes-consent',
        analytics: 'cookieyes-consent',
        performance: 'cookieyes-consent',
        marketing: 'cookieyes-consent',
    };
    return CookieYesConsentHandler;
}(AbstractConsentHandler));


;// ./ts/ConsentHandler/cookiebot.consent-handler.ts
var cookiebot_consent_handler_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var CookiebotConsentHandler = /** @class */ (function (_super) {
    cookiebot_consent_handler_extends(CookiebotConsentHandler, _super);
    function CookiebotConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CookiebotConsentHandler.prototype.getConsentHandlerName = function () {
        return CookiebotConsentHandler.consentHandlerName;
    };
    ;
    CookiebotConsentHandler.prototype.getConsentTypeMapping = function () {
        return CookiebotConsentHandler.consentTypeMapping;
    };
    CookiebotConsentHandler.prototype.getCookieNameMapping = function () {
        return CookiebotConsentHandler.cookieNameMapping;
    };
    CookiebotConsentHandler.prototype.getInitialConsent = function () {
        return {
            necessary: this.getConsentFromCookie('necessary') === true ? 'granted' : 'denied',
            functional: this.getConsentFromCookie('functional') === true ? 'granted' : 'denied',
            analytics: this.getConsentFromCookie('analytics') === true ? 'granted' : 'denied',
            performance: this.getConsentFromCookie('performance') === true ? 'granted' : 'denied',
            marketing: this.getConsentFromCookie('marketing') === true ? 'granted' : 'denied',
        };
    };
    CookiebotConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        window.addEventListener('CookiebotOnConsentReady', function () {
            console.log('CookiebotOnConsentReady');
            if (_this.getConsentFromCookie('marketing') === true) {
                _this.updateConsent({
                    marketing: 'granted',
                });
            }
            else if (_this.getConsentFromCookie('marketing') === false) {
                _this.updateConsent({
                    marketing: 'denied',
                });
            }
        });
    };
    CookiebotConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return cookieValue.includes(this.mapConsentType(consentType) + ':true');
    };
    CookiebotConsentHandler.consentHandlerName = 'cookiebot';
    CookiebotConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'preferences',
        analytics: 'statistics',
        performance: 'preferences',
        marketing: 'marketing',
    };
    CookiebotConsentHandler.cookieNameMapping = {
        necessary: 'CookieConsent',
        functional: 'CookieConsent',
        analytics: 'CookieConsent',
        performance: 'CookieConsent',
        marketing: 'CookieConsent',
    };
    return CookiebotConsentHandler;
}(AbstractConsentHandler));


;// ./ts/ConsentHandler/custom.consent-handler.ts
var custom_consent_handler_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var custom_consent_handler_assign = (undefined && undefined.__assign) || function () {
    custom_consent_handler_assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return custom_consent_handler_assign.apply(this, arguments);
};

var CustomConsentHandler = /** @class */ (function (_super) {
    custom_consent_handler_extends(CustomConsentHandler, _super);
    function CustomConsentHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomConsentHandler.prototype.getConsentHandlerName = function () {
        return CustomConsentHandler.consentHandlerName;
    };
    ;
    CustomConsentHandler.prototype.getConsentTypeMapping = function () {
        return CustomConsentHandler.consentTypeMapping;
    };
    CustomConsentHandler.prototype.getCookieNameMapping = function () {
        return CustomConsentHandler.cookieNameMapping;
    };
    CustomConsentHandler.prototype.getInitialConsent = function () {
        var defaultConsent = {
            necessary: 'denied',
            functional: 'denied',
            analytics: 'denied',
            performance: 'denied',
            marketing: 'denied',
        };
        if (window.beslist_tracking_js_consent) {
            return window.beslist_tracking_js_consent.reduce(function (accumulator, current) {
                return custom_consent_handler_assign(custom_consent_handler_assign({}, accumulator), current);
            }, defaultConsent);
        }
        return defaultConsent;
    };
    CustomConsentHandler.prototype.initializeConsentUpdateListener = function () {
        var _this = this;
        document.addEventListener('beslist_tracking_js_consent', function (event) {
            var consentStatusData = {};
            if (event.detail.hasOwnProperty(_this.mapConsentType('necessary'))) {
                consentStatusData.necessary = event.detail[_this.mapConsentType('necessary')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('functional'))) {
                consentStatusData.functional = event.detail[_this.mapConsentType('functional')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('analytics'))) {
                consentStatusData.analytics = event.detail[_this.mapConsentType('analytics')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('performance'))) {
                consentStatusData.performance = event.detail[_this.mapConsentType('performance')] === 'granted' ? 'granted' : 'denied';
            }
            if (event.detail.hasOwnProperty(_this.mapConsentType('marketing'))) {
                consentStatusData.marketing = event.detail[_this.mapConsentType('marketing')] === 'granted' ? 'granted' : 'denied';
            }
            _this.updateConsent(consentStatusData);
        });
    };
    CustomConsentHandler.prototype.parseConsentCookieValue = function (consentType, cookieValue) {
        return undefined;
    };
    CustomConsentHandler.consentHandlerName = 'custom';
    CustomConsentHandler.consentTypeMapping = {
        necessary: 'necessary',
        functional: 'functional',
        analytics: 'analytics',
        performance: 'performance',
        marketing: 'marketing',
    };
    CustomConsentHandler.cookieNameMapping = {
        necessary: undefined,
        functional: undefined,
        analytics: undefined,
        performance: undefined,
        marketing: undefined,
    };
    return CustomConsentHandler;
}(AbstractConsentHandler));


;// ./ts/event-handler.ts

var EventHandler = /** @class */ (function () {
    function EventHandler(configuration) {
        this.known_advertising_params = [
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
        this.configuration = configuration;
    }
    EventHandler.prototype.sendSessionStart = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var eventData = {
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
                    sessionStartReasons: _this.getSessionStartReasons().join('|'),
                },
            };
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    }
                    else {
                        reject(xmlHttpRequest.status);
                    }
                }
            };
            xmlHttpRequest.open('POST', _this.configuration.eventApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send(JSON.stringify(eventData));
        });
    };
    EventHandler.prototype.sendQueuedEvents = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.onreadystatechange = function () {
                if (xmlHttpRequest.readyState === 4) {
                    if (xmlHttpRequest.status === 200) {
                        resolve(xmlHttpRequest.status);
                    }
                    else {
                        reject(xmlHttpRequest.status);
                    }
                }
            };
            xmlHttpRequest.open('POST', _this.configuration.queuedEventsApiUrl, true);
            xmlHttpRequest.setRequestHeader('Content-Type', 'application/json');
            xmlHttpRequest.setRequestHeader('X-Beslist-Token', CookieHandler.getCookie('form_key') || '');
            xmlHttpRequest.send();
        });
    };
    EventHandler.prototype.hasSessionIDCookie = function () {
        return CookieHandler.getCookie(this.configuration.sessionIDCookieName) !== undefined;
    };
    EventHandler.prototype.requiresSessionStart = function () {
        return this.getSessionStartReasons().length >= 1;
    };
    EventHandler.prototype.getSessionStartReasons = function () {
        var sessionStartReasons = [];
        if (!this.hasSessionIDCookie()) {
            sessionStartReasons.push('no session id');
        }
        if (this.isPageReload()) {
            return sessionStartReasons;
        }
        if (document.referrer !== '') {
            var referrerHost = new URL(document.referrer).hostname.split('.').slice(-2).join('.');
            var currentHost = location.hostname.split('.').slice(-2).join('.');
            if (referrerHost !== currentHost) {
                sessionStartReasons.push('new referrer');
            }
        }
        else {
            sessionStartReasons.push('new referrer');
        }
        if (window.location.search.indexOf('utm_') > -1) {
            sessionStartReasons.push('utm detected');
        }
        if (window.location.search.indexOf('clientUuid') > -1) {
            sessionStartReasons.push('new uuid detected');
        }
        else if (window.location.search.indexOf('bl3nlclid') > -1) {
            sessionStartReasons.push('new bl3nlclid detected');
        }
        if (this.known_advertising_params.some(function (param) { return window.location.search.includes(param); }) && window.location.search.indexOf('_gl') === -1) {
            sessionStartReasons.push('advertising param detected');
        }
        return sessionStartReasons;
    };
    EventHandler.prototype.isPageReload = function () {
        // @ts-ignore - See: https://github.com/microsoft/TypeScript/issues/58644
        return (window.performance.navigation && window.performance.navigation.type === 1) || performance.getEntriesByType('navigation').some(function (entry) { return entry.type === 'reload'; });
    };
    return EventHandler;
}());


;// ./ts/beslist-handler.ts





var BeslistHandler = /** @class */ (function () {
    function BeslistHandler(configuration) {
        var _this = this;
        this.hasSentSessionStart = false;
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
        }
        else {
            this.consentHandler.subscribe(function (consentData) { return _this.handleConsentUpdateEvent(consentData); });
            this.consentHandler.initialize();
        }
    }
    BeslistHandler.prototype.addCustomConsentMethods = function () {
        window.beslist_tracking_js_consent = window.beslist_tracking_js_consent || [];
        var consentFromAction = this.configuration.consentFromAction;
        if (consentFromAction) {
            window.beslist_tracking_js_consent.push(consentFromAction);
        }
        window.beslist_tracking_update_consent = function (value) {
            window.beslist_tracking_js_consent.push(value);
            document.dispatchEvent(new CustomEvent('beslist_tracking_js_consent', { detail: value }));
        };
    };
    BeslistHandler.prototype.handleConsentUpdateEvent = function (consentData) {
        var _this = this;
        CookieHandler.setCookie(this.configuration.consentCookieName, JSON.stringify(consentData), 365 * 24 * 60 * 60);
        if (this.configuration.hasQueuedEvents && this.isConsentOfTypesGranted(this.configuration.requiredConsentTypes, consentData.consent)) {
            this.eventHandler.sendQueuedEvents().then(function () {
                _this.configuration.hasQueuedEvents = false;
            });
        }
        if (!this.hasSentSessionStart && this.eventHandler.requiresSessionStart()) {
            this.eventHandler.sendSessionStart().then(function () {
                _this.hasSentSessionStart = true;
                if (!_this.isConsentOfTypesGranted(_this.configuration.requiredConsentTypes, consentData.consent)) {
                    _this.configuration.hasQueuedEvents = true;
                }
            });
        }
    };
    BeslistHandler.prototype.isConsentOfTypesGranted = function (consentTypes, consentStatusData) {
        var _this = this;
        return consentTypes.every(function (consentType) {
            return _this.isConsentOfTypeGranted(consentType, consentStatusData);
        });
    };
    BeslistHandler.prototype.isConsentOfTypeGranted = function (consentType, consentStatusData) {
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
    };
    BeslistHandler.prototype.getActiveConsentHandler = function () {
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
    };
    return BeslistHandler;
}());
window.addEventListener('beslistTrackingConfigReady', function (event) {
    var customEvent = event; // type assertion here
    var configData = customEvent.detail;
    new BeslistHandler(configData);
});

/******/ })()
;