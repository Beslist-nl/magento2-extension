<?php

namespace Beslist\BeslistTracking\Observer;

use Beslist\BeslistTracking\Helper\SettingsHelper;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
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

    /**
     * @param LoggerInterface $logger
     * @param SettingsHelper $settingsHelper
     * @param HelperFunctions $helper
     */
    public function __construct(
        LoggerInterface $logger,
        SettingsHelper  $settingsHelper,
        HelperFunctions $helper
    ) {
        $this->logger = $logger;
        $this->settingsHelper = $settingsHelper;
        $this->helper = $helper;
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
        } catch (Throwable $e) {
            $this->logger->error('Failed to capture Beslist tracking data on order placement', [
                'exception' => $e,
            ]);
        }
    }
}
