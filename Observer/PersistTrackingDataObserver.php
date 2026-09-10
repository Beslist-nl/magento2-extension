<?php

namespace Beslist\BeslistTracking\Observer;

use Beslist\BeslistTracking\Helper\SettingsHelper;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Magento\Framework\App\Area;
use Magento\Framework\App\State;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Sales\Model\Order;
use Psr\Log\LoggerInterface;
use Throwable;

/**
 * Captures the Beslist attribution identifiers on the order while the customer
 * is still on-site (during Order::place()).
 */
class PersistTrackingDataObserver implements ObserverInterface
{
    /** @var LoggerInterface */
    protected LoggerInterface $logger;
    /** @var SettingsHelper */
    private SettingsHelper $settingsHelper;
    /** @var HelperFunctions */
    private HelperFunctions $helper;
    /** @var State */
    private State $appState;

    /**
     * @param LoggerInterface $logger
     * @param SettingsHelper $settingsHelper
     * @param HelperFunctions $helper
     * @param State $appState
     */
    public function __construct(
        LoggerInterface $logger,
        SettingsHelper  $settingsHelper,
        HelperFunctions $helper,
        State           $appState
    ) {
        $this->logger = $logger;
        $this->settingsHelper = $settingsHelper;
        $this->helper = $helper;
        $this->appState = $appState;
    }

    /**
     * Captures the Beslist attribution identifiers on the order being placed.
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer): void
    {
        try {
            if (!$this->settingsHelper->isTrackingEnabled()) {
                return;
            }

            if ($this->isAdminRequest()) {
                return;
            }

            /** @var Order|null $order */
            $order = $observer->getEvent()->getOrder();
            if (!$order) {
                return;
            }

            $sessionID = $this->helper->getSessionIDFromCookie();
            if (!$sessionID) {
                return;
            }

            $consent = $this->helper->getConsentFromCookie();
            if (!$consent
                || !isset($consent['consent'])
                || !$this->helper->isRequiredConsentGranted($consent['consent'])
            ) {
                return;
            }

            $order->setData('beslist_session_id', $sessionID);
            $order->setData('beslist_user_id', $this->helper->getUserIDFromCookie());
            $order->setData('beslist_visitor_ip', $this->helper->getHashedVisitorIP());
            $order->setData(
                'beslist_user_agent',
                mb_substr($this->helper->getUserAgent(), 0, BeslistTrackingConfiguration::USER_AGENT_MAX_LENGTH)
            );
            $order->setData('beslist_language', mb_substr($this->helper->getVisitorLocale(), 0, 32));
            $order->setData('beslist_host', mb_substr($this->helper->getHost(), 0, 255));
            $order->setData(
                'beslist_referrer',
                mb_substr($this->helper->getReferrer(), 0, BeslistTrackingConfiguration::REFERRER_MAX_LENGTH)
            );
        } catch (Throwable $e) {
            $this->logger->error('Failed to capture Beslist tracking data on order placement', [
                'exception' => $e,
            ]);
        }
    }

    /**
     * Whether the order is being placed from the admin panel.
     *
     * Only adminhtml is excluded: the cookies on such a request belong to the operator
     * rather than the customer. Allow-listing frontend instead would drop storefront
     * orders, which are placed in webapi_rest. An unresolvable area still captures --
     * the cookie check below is the real gate.
     *
     * @return bool
     */
    private function isAdminRequest(): bool
    {
        try {
            return $this->appState->getAreaCode() === Area::AREA_ADMINHTML;
        } catch (Throwable $e) {
            return false;
        }
    }
}
