<?php

namespace Beslist\BeslistTracking\Test\Integration\CustomerData;

use Beslist\BeslistTracking\CustomerData\TrackingConfiguration;
use Beslist\BeslistTracking\Model\OrderReportability;
use Beslist\BeslistTracking\Observer\SuccessPageObserver;
use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Framework\Event\ManagerInterface;
use Magento\Framework\Session\SessionManagerInterface;
use Magento\Sales\Api\OrderRepositoryInterface;
use Magento\Sales\Model\Order;
use Magento\TestFramework\Helper\Bootstrap;
use Magento\TestFramework\ObjectManager;
use PHPUnit\Framework\TestCase;

/**
 * Covers the data the browser needs to send a cookieless conversion ping.
 *
 * @magentoDbIsolation enabled
 */
class ConversionPingDataTest extends TestCase
{
    private const INCREMENT_ID = '100000001';
    private const REDIRECT_METHOD = 'paypal_express';

    /** @var ObjectManager */
    private $objectManager;
    /** @var CheckoutSession */
    private $checkoutSession;
    /** @var OrderRepositoryInterface */
    private $orderRepository;

    protected function setUp(): void
    {
        $this->objectManager = Bootstrap::getObjectManager();
        $this->checkoutSession = $this->objectManager->get(CheckoutSession::class);
        $this->orderRepository = $this->objectManager->get(OrderRepositoryInterface::class);
    }

    protected function tearDown(): void
    {
        $this->checkoutSession->setLastRealOrderId(null);
        $this->objectManager->get(SessionManagerInterface::class)->unsetData(SuccessPageObserver::SESSION_KEY);
    }

    /**
     * The marker must be produced by the real event, not only consumed.
     *
     * Every other test here sets the session marker by hand, so they pass whether or not
     * SuccessPageObserver is actually wired up. It was not, on 24-09: the observer existed and
     * etc/frontend/events.xml was correct, but the config cache had not been flushed, so no order
     * pinged at all and the abandoned-order test passed for the wrong reason. This dispatches the
     * real event so an unregistered observer fails the suite.
     *
     * @magentoAppArea frontend
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testTheSuccessPageEventProducesTheMarker(): void
    {
        $session = $this->objectManager->get(SessionManagerInterface::class);
        $session->start();
        $session->unsetData(SuccessPageObserver::SESSION_KEY);

        $order = $this->loadOrder();
        $this->checkoutSession->setLastRealOrderId(self::INCREMENT_ID);

        $this->objectManager->get(ManagerInterface::class)
            ->dispatch('checkout_onepage_controller_success_action', ['order' => $order]);

        $this->assertSame(
            self::INCREMENT_ID,
            $session->getData(SuccessPageObserver::SESSION_KEY),
            'SuccessPageObserver must be registered and must record the confirmed order.'
        );

        $this->assertNotNull(
            $this->getSectionData()['conversionData'],
            'The marker the observer wrote must be enough for the section to offer the conversion.'
        );
    }

    /**
     * Puts the session in the state the shopper reaching the confirmation page leaves it in.
     *
     * @return void
     */
    private function arriveOnTheSuccessPage(): void
    {
        $this->checkoutSession->setLastRealOrderId(self::INCREMENT_ID);
        $session = $this->objectManager->get(SessionManagerInterface::class);
        $session->start();
        $session->setData(SuccessPageObserver::SESSION_KEY, self::INCREMENT_ID);
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testOffersTheConversionOnceForAReportableOrder(): void
    {
        $this->arriveOnTheSuccessPage();

        $section = $this->getSectionData();

        $this->assertNotNull($section['conversionData'], 'A reportable order must be offered to the browser.');
        $this->assertSame(self::INCREMENT_ID, $section['conversionData']['transactionID']);
        $this->assertEqualsWithDelta(100.0, $section['conversionData']['value'], 0.001);
        $this->assertTrue($section['conversionData']['includingVAT']);
        $this->assertSame('4321', $section['advertiserID']);
        $this->assertTrue($section['cookielessPingsEnabled']);

        $this->assertSame(
            1,
            (int) $this->loadOrder()->getData('beslist_ping_sent'),
            'Handing the conversion out must be recorded on the order.'
        );

        // A shopper reloading the success page must not produce a second ping: this count is an
        // invoicing input, and GTM and WordPress both double-count that reload.
        $this->assertNull(
            $this->getSectionData()['conversionData'],
            'The same order must never be offered twice.'
        );
    }

    /**
     * A redirect payment is confirmed after the success page has already rendered - measured at six
     * seconds on order 000000035 - so gating the ping on payment would lose it. Reaching the success
     * page is the filter instead. The conversion EVENT still waits for payment; only the ping does not.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testOffersAnOrderThatIsStillAwaitingPayment(): void
    {
        $order = $this->loadOrder();
        $order->getPayment()->setMethod(self::REDIRECT_METHOD);
        $order->setState(Order::STATE_PENDING_PAYMENT)
            ->setStatus($order->getConfig()->getStateDefaultStatus(Order::STATE_PENDING_PAYMENT));
        $this->orderRepository->save($order);

        $this->arriveOnTheSuccessPage();

        $this->assertNotNull(
            $this->getSectionData()['conversionData'],
            'An order awaiting confirmation must still be offered, or redirect payments never ping.'
        );
        $this->assertSame(1, (int) $this->loadOrder()->getData('beslist_ping_sent'));
    }

    /**
     * The conversion event keeps the stricter gate, so relaxing the ping cannot reintroduce the
     * 1.1.0 defect of reporting unpaid orders as conversions.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testTheTwoGatesDisagreeOnlyForAnUnconfirmedOrder(): void
    {
        $reportability = $this->objectManager->get(OrderReportability::class);

        $order = $this->loadOrder();
        $order->getPayment()->setMethod(self::REDIRECT_METHOD);
        $order->setState(Order::STATE_PENDING_PAYMENT)
            ->setStatus($order->getConfig()->getStateDefaultStatus(Order::STATE_PENDING_PAYMENT));

        $this->assertTrue($reportability->isCountable($order), 'The ping counts it.');
        $this->assertFalse($reportability->isReportable($order), 'The conversion event does not.');

        $order->setState(Order::STATE_CANCELED)
            ->setStatus($order->getConfig()->getStateDefaultStatus(Order::STATE_CANCELED));

        $this->assertFalse($reportability->isCountable($order), 'Neither counts a cancelled order.');
        $this->assertFalse($reportability->isReportable($order));
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testOffersNothingForACancelledOrder(): void
    {
        $order = $this->loadOrder();
        $order->getPayment()->setMethod(self::REDIRECT_METHOD);
        $order->setState(Order::STATE_CANCELED)
            ->setStatus($order->getConfig()->getStateDefaultStatus(Order::STATE_CANCELED));
        $this->orderRepository->save($order);

        $this->arriveOnTheSuccessPage();

        $this->assertNull($this->getSectionData()['conversionData']);
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 0
     */
    public function testOffersNothingWhenPingsAreDisabled(): void
    {
        $this->arriveOnTheSuccessPage();

        $section = $this->getSectionData();

        $this->assertNull($section['conversionData']);
        $this->assertFalse($section['cookielessPingsEnabled']);
        $this->assertSame(
            0,
            (int) $this->loadOrder()->getData('beslist_ping_sent'),
            'A disabled ping must not consume the order either.'
        );
    }

    /**
     * A shopper who abandons the payment and browses back has an order sitting in the session but
     * never saw the confirmation page. Counting it would bill the merchant for an abandoned
     * checkout - measured on order 000000040 before this was gated.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testOffersNothingForAnOrderWhoseConfirmationPageWasNeverReached(): void
    {
        // In the session, but no confirmation page was ever rendered for it.
        $this->checkoutSession->setLastRealOrderId(self::INCREMENT_ID);

        $this->assertNull(
            $this->getSectionData()['conversionData'],
            'An abandoned checkout must not be counted.'
        );
        $this->assertSame(0, (int) $this->loadOrder()->getData('beslist_ping_sent'));
    }

    /**
     * An order placed in the admin never passes through a checkout session, so there is no last
     * real order to offer - which is why no explicit admin check is needed.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_cookieless_pings 1
     */
    public function testOffersNothingWithoutACheckoutSession(): void
    {
        $this->assertNull($this->getSectionData()['conversionData']);
        $this->assertSame(0, (int) $this->loadOrder()->getData('beslist_ping_sent'));
    }

    /**
     * @return array
     */
    private function getSectionData(): array
    {
        return $this->objectManager->create(TrackingConfiguration::class)->getSectionData();
    }

    /**
     * @return Order
     */
    private function loadOrder(): Order
    {
        return $this->objectManager->create(Order::class)->loadByIncrementId(self::INCREMENT_ID);
    }
}
