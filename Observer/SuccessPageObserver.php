<?php

namespace Beslist\BeslistTracking\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Session\SessionManagerInterface;
use Magento\Sales\Model\Order;
use Psr\Log\LoggerInterface;
use Throwable;

/**
 * Records that the shopper actually reached the order confirmation page.
 */
class SuccessPageObserver implements ObserverInterface
{
    public const SESSION_KEY = 'beslist_conversion_ping_order_id';

    /** @var SessionManagerInterface */
    private SessionManagerInterface $session;
    /** @var LoggerInterface */
    private LoggerInterface $logger;

    /**
     * @param SessionManagerInterface $session
     * @param LoggerInterface $logger
     */
    public function __construct(
        SessionManagerInterface $session,
        LoggerInterface $logger
    ) {
        $this->session = $session;
        $this->logger = $logger;
    }

    /**
     * Marks the confirmed order as one the browser may be offered a ping for.
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer): void
    {
        try {
            /** @var Order|null $order */
            $order = $observer->getEvent()->getOrder();

            if (!$order || !$order->getIncrementId()) {
                return;
            }

            $this->session->start();
            $this->session->setData(self::SESSION_KEY, $order->getIncrementId());
        } catch (Throwable $e) {
            $this->logger->error('Failed to record the Beslist conversion ping marker', [
                'exception' => $e,
            ]);
        }
    }
}
