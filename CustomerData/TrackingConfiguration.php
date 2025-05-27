<?php

namespace Beslist\BeslistTracking\CustomerData;

use Beslist\BeslistTracking\Helper\ConsentHelper;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Beslist\BeslistTracking\src\EventHandler;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Magento\Customer\CustomerData\SectionSourceInterface;
use Beslist\BeslistTracking\Helper\SettingsHelper;
use Magento\Framework\Data\Form\FormKey;
use Magento\Framework\Exception\LocalizedException;

class TrackingConfiguration implements SectionSourceInterface
{
    /** @var SettingsHelper */
    protected SettingsHelper $settingsHelper;
    /** @var EventHandler */
    private EventHandler $eventHandler;
    /** @var FormKey */
    private FormKey $formKey;
    /** @var ConsentHelper */
    private ConsentHelper $consentHelper;
    /** @var HelperFunctions */
    private HelperFunctions $helperFunctions;

    /**
     * TrackingConfiguration constructor.
     *
     * @param SettingsHelper $settingsHelper
     * @param EventHandler $eventHandler
     * @param FormKey $formKey
     * @param ConsentHelper $consentHelper
     * @param HelperFunctions $helperFunctions
     */
    public function __construct(
        SettingsHelper $settingsHelper,
        EventHandler   $eventHandler,
        FormKey        $formKey,
        ConsentHelper  $consentHelper,
        HelperFunctions $helperFunctions
    ) {
        $this->settingsHelper = $settingsHelper;
        $this->eventHandler = $eventHandler;
        $this->formKey = $formKey;
        $this->consentHelper = $consentHelper;
        $this->helperFunctions = $helperFunctions;
    }

    /**
     * Returns data for the customer data section related to tracking configuration.
     *
     * @return array
     * @throws LocalizedException
     */
    public function getSectionData(): array
    {
        return [
            'isTrackingEnabled' => $this->settingsHelper->isTrackingEnabled(),
            'activeConsentHandlerName' => $this->settingsHelper->getActiveConsentHandlerName(),
            'hasQueuedEvents' => (
                $this->helperFunctions->getUserIDFromCookie()
                && $this->eventHandler->hasQueuedEvents($this->helperFunctions->getUserIDFromCookie())
            ),
            'requiredConsentTypes' => BeslistTrackingConfiguration::REQUIRED_CONSENT_TYPES,
            'consentCookieName' => BeslistTrackingConfiguration::CONSENT_COOKIE_NAME,
            'eventApiUrl' => BeslistTrackingConfiguration::EVENT_API_URL,
            'queuedEventsApiUrl' => BeslistTrackingConfiguration::QUEUED_EVENTS_API_URL,
            'sessionIDCookieName' => BeslistTrackingConfiguration::SESSION_ID_COOKIE_NAME,
            'consentFromAction' => $this->consentHelper->getCustomConsent(true),
            'areCustomTriggersEnabled' => $this->settingsHelper->areCustomConsentTriggersEnabled(),
            'formKey' => $this->formKey->getFormKey(),
        ];
    }
}
