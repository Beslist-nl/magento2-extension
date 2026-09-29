<?php

namespace Beslist\BeslistTracking\Helper;

use Beslist\BeslistTracking\src\Consent\CustomConsentManagementPlatform;
use Laminas\Uri\UriFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Throwable;

class SettingsHelper
{
    /** @var ScopeConfigInterface */
    private ScopeConfigInterface $scopeConfig;

    /**
     * SettingsHelper constructor.
     *
     * @param ScopeConfigInterface $scopeConfig
     */
    public function __construct(
        ScopeConfigInterface $scopeConfig
    ) {
        $this->scopeConfig = $scopeConfig;
    }

    /**
     * Checks if tracking is enabled in the store configuration.
     *
     * @return bool
     */
    public function isTrackingEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(
            'beslist_tracking_tracking/tracking_settings/enable_tracking',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Checks whether the cookieless pings are enabled in the store configuration.
     *
     * @return bool
     */
    public function areCookielessPingsEnabled(): bool
    {
        if (!$this->isTrackingEnabled()) {
            return false;
        }

        return $this->scopeConfig->isSetFlag(
            'beslist_tracking_tracking/tracking_settings/enable_cookieless_pings',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Retrieves the configured Advertiser ID from the store configuration.
     *
     * @return string|null
     */
    public function getAdvertiserID(): ?string
    {
        return $this->scopeConfig->getValue(
            'beslist_tracking_tracking/tracking_settings/advertiser_id',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Retrieves the canonical host of a store from its configured base URL.
     *
     * @param int|null $storeId
     * @return string|null
     */
    public function getStoreHost(?int $storeId = null): ?string
    {
        $baseUrl = $this->scopeConfig->getValue(
            'web/secure/base_url',
            ScopeInterface::SCOPE_STORE,
            $storeId
        );

        if (!$baseUrl) {
            return null;
        }

        try {
            return UriFactory::factory($baseUrl)->getHost() ?: null;
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Retrieves the active consent handler name from the store configuration.
     *
     * @return string|null
     */
    public function getActiveConsentHandlerName(): ?string
    {
        return $this->scopeConfig->getValue(
            'beslist_tracking_consent/consent_settings/consent_handler',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Checks whether custom consent triggers are enabled.
     *
     * @return bool
     */
    public function areCustomConsentTriggersEnabled(): bool
    {
        $activeConsentHandlerName = $this->getActiveConsentHandlerName();

        return $activeConsentHandlerName === CustomConsentManagementPlatform::HANDLER_NAME;
    }
}
