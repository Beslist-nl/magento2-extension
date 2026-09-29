<?php

namespace Beslist\BeslistTracking\Model;

use Magento\Sales\Model\Order;

/**
 * Decides whether an order may be sent to Beslist, for the event and for the ping.
 *
 * The two use different gates on purpose - see isReportable() and isCountable().
 */
class OrderReportability
{
    private const PAID_STATES = [
        Order::STATE_PROCESSING,
        Order::STATE_COMPLETE,
    ];

    /**
     * Whether the order has been paid, or uses a method that settles outside the shop.
     *
     * An offline method can never reach a paid state here, so waiting for one would mean never
     * reporting those orders at all.
     *
     * @param Order $order
     * @return bool
     */
    public function isReportable(Order $order): bool
    {
        if (!$this->isCountable($order)) {
            return false;
        }

        if (in_array($order->getState(), self::PAID_STATES, true)) {
            return true;
        }

        $payment = $order->getPayment();

        return $payment !== null && $payment->getMethodInstance()->isOffline();
    }

    /**
     * Whether the order may be counted by the cookieless ping.
     *
     * Looser than isReportable() because the ping is sent by the browser, and the browser is gone
     * before a redirect payment is confirmed: on a measured order the success page rendered six
     * seconds before the order reached "processing", so gating the ping on payment would have lost
     * it. Reaching the success page is the filter instead - a shopper who cancels at the provider
     * is returned to the cancel URL and never gets there.
     *
     * @param Order $order
     * @return bool
     */
    public function isCountable(Order $order): bool
    {
        return !$order->isCanceled() && $order->getState() !== Order::STATE_CLOSED;
    }
}
