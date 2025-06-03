export interface BeslistHandlerConfigurationInterface {
    isTrackingEnabled: boolean,
    activeConsentHandlerName?: string,
    hasQueuedEvents: boolean,
    requiredConsentTypes: string[],
    consentCookieName: string,
    eventApiUrl: string,
    queuedEventsApiUrl: string,
    sessionIDCookieName: string,
    consentFromAction: {[key: string]: string},
    areCustomTriggersEnabled: boolean,
    formKey: string,
}
