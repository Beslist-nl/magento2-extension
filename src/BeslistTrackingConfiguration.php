<?php

namespace Beslist\BeslistTracking\src;

use Beslist\BeslistTracking\src\Consent\CookiebotConsentManagementPlatform;
use Beslist\BeslistTracking\src\Consent\CookieYesConsentManagementPlatform;
use Beslist\BeslistTracking\src\Consent\CustomConsentManagementPlatform;

class BeslistTrackingConfiguration
{
    public const BESLIST_TRACKING_VERSION = '1.0.0';
    public const OPTION_GROUP_PREFIX = 'beslist_tracking_options_';
    private const OPTION_PREFIX = 'beslist_tracking_option_';
    public const ADVERTISER_IDS_FIELD_ID = self::OPTION_PREFIX . 'advertiser_ids';
    public const ENABLE_MULTIPLE_ADVERTISER_IDS = self::OPTION_PREFIX . 'enable_multiple_advertiser_ids';
    public const ENABLE_TRACKING_FIELD_ID = self::OPTION_PREFIX . 'enable_tracking';
    public const ENABLE_CUSTOM_CONSENT_TRIGGERS_FIELD_ID = self::OPTION_PREFIX . 'enable_custom_consent_triggers';
    public const API_ROUTE_NAMESPACE = '/beslist-tracking';
    public const API_EVENT_ROUTE = '/index/event';
    public const EVENT_API_URL = self::API_ROUTE_NAMESPACE . self::API_EVENT_ROUTE;
    public const API_QUEUED_EVENTS_ROUTE = '/index/queuedevents';
    public const QUEUED_EVENTS_API_URL = self::API_ROUTE_NAMESPACE . self::API_QUEUED_EVENTS_ROUTE;
    public const BESLIST_ENDPOINT_URL = 'https://ct.beslist.nl/ct_event';
    public const COOKIE_PREFIX = 'bsls_tr';
    public const CONSENT_COOKIE_NAME = self::COOKIE_PREFIX . '_consent';
    public const SESSION_ID_COOKIE_NAME = self::COOKIE_PREFIX . '_session_id';
    public const SESSION_ID_COOKIE_LIFETIME = 1800; // 30 minutes
    public const USER_ID_COOKIE_NAME = self::COOKIE_PREFIX . '_user_id';
    public const USER_ID_COOKIE_LIFETIME = 46656000; // 540 days
    public const EVENT_QUEUE_TABLE_NAME = 'beslist_tracking_queued_events';
    public const QUEUED_EVENT_MAX_AGE_MODIFIER = '-1 month';
    public const CONSENT_TYPE_NECESSARY = 'necessary';
    public const CONSENT_TYPE_FUNCTIONAL = 'functional';
    public const CONSENT_TYPE_ANALYTICS = 'analytics';
    public const CONSENT_TYPE_PERFORMANCE = 'performance';
    public const CONSENT_TYPE_MARKETING = 'marketing';
    public const REQUIRED_CONSENT_TYPES = [self::CONSENT_TYPE_MARKETING];
    public const COMPATIBLE_CONSENT_MANAGEMENT_PLATFORMS = [
        [
            'handlerName' => CookieYesConsentManagementPlatform::HANDLER_NAME,
            'name' => CookieYesConsentManagementPlatform::NAME
        ],
        [
            'handlerName' => CookiebotConsentManagementPlatform::HANDLER_NAME,
            'name' => CookiebotConsentManagementPlatform::NAME
        ],
        [
            'handlerName' => CustomConsentManagementPlatform::HANDLER_NAME,
            'name' => CustomConsentManagementPlatform::NAME
        ]
    ];
}
