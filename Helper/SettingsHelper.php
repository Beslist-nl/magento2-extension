<?php

namespace Beslist\BeslistTracking\Helper;

use Beslist\BeslistTracking\src\Consent\CustomConsentManagementPlatform;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;

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
