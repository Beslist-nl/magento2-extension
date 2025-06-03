<?php

namespace Beslist\BeslistTracking\Helper;

use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Magento\Framework\Session\SessionManagerInterface;

class ConsentHelper
{
    /** @var SessionManagerInterface */
    private SessionManagerInterface $session;

    /**
     * ConsentHelper constructor.
     *
     * @param SessionManagerInterface $session
     */
    public function __construct(
        SessionManagerInterface $session
    ) {
        $this->session = $session;
    }

    /**
     * Stores custom consent data into the session after validating consent values.
     *
     * @param array $consent
     * @return void
     */
    public function setCustomConsent(array $consent = []): void
    {
        $consentTypes = [
            BeslistTrackingConfiguration::CONSENT_TYPE_NECESSARY,
            BeslistTrackingConfiguration::CONSENT_TYPE_FUNCTIONAL,
            BeslistTrackingConfiguration::CONSENT_TYPE_ANALYTICS,
            BeslistTrackingConfiguration::CONSENT_TYPE_PERFORMANCE,
            BeslistTrackingConfiguration::CONSENT_TYPE_MARKETING,
        ];

        $parsedConsent = [];
        foreach ($consentTypes as $consentType) {
            if (isset($consent[$consentType]) && $this->isConsentValid($consent[$consentType])) {
                $parsedConsent[$consentType] = $consent[$consentType];
            }
        }

        $this->session->start();
        if (!empty($parsedConsent)) {
            $this->session->setBeslistTrackingConsentFromAction($parsedConsent);
        } else {
            $this->session->setBeslistTrackingConsentFromAction(null);
        }
    }

    /**
     * Retrieves the custom consent data from the session.
     *
     * Optionally clears the stored consent after retrieval.
     *
     * @param bool $clearCustomConsent
     * @return array|null
     */
    public function getCustomConsent(bool $clearCustomConsent = false): ?array
    {
        $this->session->start();
        $consentFromAction = $this->session->getBeslistTrackingConsentFromAction();

        if ($clearCustomConsent) {
            $this->clearCustomConsent();
        }

        return $consentFromAction;
    }

    /**
     * Clears the custom consent data from the session.
     *
     * @return void
     */
    public function clearCustomConsent(): void
    {
        $this->session->start();
        $this->session->unsBeslistTrackingConsentFromAction();
    }

    /**
     * Validates a consent value.
     *
     * @param string $consent
     * @return bool
     */
    public function isConsentValid(string $consent): bool
    {
        return $consent === 'granted' || $consent === 'denied';
    }
}
