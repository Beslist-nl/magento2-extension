<?php

namespace Beslist\BeslistTracking\Observer;

use Beslist\BeslistTracking\Helper\SettingsHelper;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Beslist\BeslistTracking\Model\OrderReportability;
use Beslist\BeslistTracking\src\EventHandler;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\ResourceModel\Order as OrderResource;
use Psr\Log\LoggerInterface;
use Throwable;

class ConversionObserver implements ObserverInterface
{
    /** @var LoggerInterface */
    protected LoggerInterface $logger;
    /** @var EventHandler */
    private EventHandler $eventHandler;
    /** @var SettingsHelper */
    private SettingsHelper $settingsHelper;
    /** @var OrderResource */
    private OrderResource $orderResource;
    /** @var OrderReportability */
    private OrderReportability $orderReportability;

    /**
     * @param LoggerInterface $logger
     * @param EventHandler $eventHandler
     * @param SettingsHelper $settingsHelper
     * @param OrderResource $orderResource
     * @param OrderReportability $orderReportability
     */
    public function __construct(
        LoggerInterface    $logger,
        EventHandler       $eventHandler,
        SettingsHelper     $settingsHelper,
        OrderResource      $orderResource,
        OrderReportability $orderReportability
    ) {
        $this->logger = $logger;
        $this->eventHandler = $eventHandler;
        $this->settingsHelper = $settingsHelper;
        $this->orderResource = $orderResource;
        $this->orderReportability = $orderReportability;
    }

    /**
     * Reports the conversion once the order has reached a paid state, at most once per order.
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
            if (!$order || !$order->getId()) {
                return;
            }

            if ((int) $order->getData('beslist_conversion_sent') === 1) {
                return;
            }

            $attempts = (int) $order->getData('beslist_conversion_attempts');
            if ($attempts >= BeslistTrackingConfiguration::MAX_CONVERSION_ATTEMPTS) {
                return;
            }

            $sessionID = $order->getData('beslist_session_id');
            if (!$sessionID) {
                return;
            }

            if (!$this->orderReportability->isReportable($order)) {
                return;
            }

            $sent = $this->eventHandler->sendConversionForOrder(
                (string) ($order->getData('beslist_user_id') ?? ''),
                (string) $sessionID,
                $order->getData('beslist_visitor_ip'),
                $order->getData('beslist_user_agent'),
                $order->getData('beslist_language'),
                $order->getData('beslist_host'),
                $order->getData('beslist_referrer'),
                (float) $order->getGrandTotal(),
                (string) $order->getIncrementId(),
                true,
                $order->getStoreId() === null ? null : (int) $order->getStoreId()
            );

            if (!$sent) {
                $order->setData('beslist_conversion_attempts', $attempts + 1);
                $this->orderResource->saveAttribute($order, 'beslist_conversion_attempts');

                return;
            }

            $order->setData('beslist_conversion_sent', 1);
            $this->orderResource->saveAttribute($order, 'beslist_conversion_sent');
        } catch (Throwable $e) {
            $this->logger->error('Failed to send Beslist conversion on order save', [
                'exception' => $e,
                'order_id' => $observer->getEvent()->getOrder() ? $observer->getEvent()->getOrder()->getId() : null,
            ]);
        }
    }
}
