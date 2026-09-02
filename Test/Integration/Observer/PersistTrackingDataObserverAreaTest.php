<?php

namespace Beslist\BeslistTracking\Test\Integration\Observer;

use Beslist\BeslistTracking\Observer\PersistTrackingDataObserver;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Beslist\BeslistTracking\Test\Integration\Stub\CookieHelperStub;
use Magento\Framework\App\Config\MutableScopeConfigInterface;
use Magento\Framework\Event\ManagerInterface;
use Magento\Sales\Model\Order;
use Magento\Store\Model\ScopeInterface;
use Magento\TestFramework\Helper\Bootstrap;
use PHPUnit\Framework\TestCase;

/**
 * Locks down the areas in which Beslist attribution is captured.
 *
 * Two separate mistakes can break capture, and this fixes both in place:
 *
 * 1. Scoping the observer's registration to an area it does not run in. Registering
 *    it in etc/frontend/events.xml silently stopped all storefront attribution,
 *    because Magento's default checkout places the order through
 *    POST /V1/guest-carts/:cartId/payment-information - which executes in
 *    `webapi_rest`, not `frontend`.
 * 2. Inverting the runtime guard in PersistTrackingDataObserver, e.g. turning the
 *    adminhtml exclusion into a frontend allow-list.
 *
 * Each test therefore dispatches the real sales_order_place_after event through the
 * event manager inside a real area, rather than calling the observer directly. A
 * directly-invoked observer bypasses registration entirely and would stay green
 * through mistake 1 - which is exactly how that regression reached a dev store.
 *
 * No database work is involved: the observer only calls setData() on the order, so
 * an unsaved Order carries the result.
 */
class PersistTrackingDataObserverAreaTest extends TestCase
{
    private const ENABLE_TRACKING_PATH = 'beslist_tracking_tracking/tracking_settings/enable_tracking';

    // Untyped on purpose: PHPUnit nulls test-case properties after each test.

    /** @var \Magento\TestFramework\ObjectManager */
    private $objectManager;

    protected function setUp(): void
    {
        $this->objectManager = Bootstrap::getObjectManager();

        // Store scope, explicitly: SettingsHelper reads with SCOPE_STORE, and the test
        // framework's config does not fall back from default scope to store scope.
        $this->objectManager->get(MutableScopeConfigInterface::class)->setValue(
            self::ENABLE_TRACKING_PATH,
            1,
            ScopeInterface::SCOPE_STORE,
            'default'
        );

        // Stand in for the browser's cookies, then drop the observer so it is
        // rebuilt around the stub on the next dispatch.
        $this->objectManager->addSharedInstance(
            $this->objectManager->create(CookieHelperStub::class),
            HelperFunctions::class
        );
        $this->objectManager->removeSharedInstance(PersistTrackingDataObserver::class);
    }

    protected function tearDown(): void
    {
        $this->objectManager->removeSharedInstance(HelperFunctions::class);
        $this->objectManager->removeSharedInstance(PersistTrackingDataObserver::class);
    }

    /**
     * The area a storefront order is actually placed in. Regressing this loses
     * attribution for every conversion the plugin exists to report.
     *
     * @magentoAppArea webapi_rest
     */
    public function testCapturesInWebapiRestArea(): void
    {
        $this->assertCaptured(
            'Magento default checkout places orders via the REST payment-information endpoint, so '
            . 'sales_order_place_after fires in webapi_rest. Skipping capture here silently strips '
            . 'attribution from every storefront order.'
        );
    }

    /**
     * @magentoAppArea graphql
     */
    public function testCapturesInGraphQlArea(): void
    {
        $this->assertCaptured(
            'Headless and PWA storefronts place orders over GraphQL. Capture must not be limited to '
            . 'the areas a Luma checkout happens to use.'
        );
    }

    /**
     * @magentoAppArea frontend
     */
    public function testCapturesInFrontendArea(): void
    {
        $this->assertCaptured(
            'Checkouts that place the order from a frontend controller must still be attributed.'
        );
    }

    /**
     * The fix for M6: cookies on an admin request belong to the staff member, not
     * the customer, so an admin-created order must not inherit them.
     *
     * @magentoAppArea adminhtml
     */
    public function testDoesNotCaptureInAdminhtmlArea(): void
    {
        $this->assertNotCaptured(
            'An order created in the admin panel must not be attributed to the operator\'s own '
            . 'Beslist session. This produced false conversions counted against the merchant.'
        );
    }

    /**
     * Characterises current behaviour rather than requiring it: a cron request
     * carries no cookies, so the cookie check downstream is the real gate. If this
     * ever needs to change, change it deliberately - do not delete the assertion.
     *
     * @magentoAppArea crontab
     */
    public function testCapturesInCrontabAreaBecauseTheCookieCheckIsTheRealGate(): void
    {
        $this->assertCaptured(
            'Only adminhtml is excluded. Cron carries no cookies in practice, so capture there is '
            . 'unreachable rather than wrong.'
        );
    }

    /**
     * Dispatches the real event and returns the order the observers saw.
     *
     * @return Order
     */
    private function dispatchPlaceAfter(): Order
    {
        /** @var Order $order */
        $order = $this->objectManager->create(Order::class);

        $this->objectManager->get(ManagerInterface::class)
            ->dispatch('sales_order_place_after', ['order' => $order]);

        return $order;
    }

    /**
     * @param string $why
     * @return void
     */
    private function assertCaptured(string $why): void
    {
        $order = $this->dispatchPlaceAfter();

        $this->assertSame(CookieHelperStub::SESSION_ID, $order->getData('beslist_session_id'), $why);
        $this->assertSame(CookieHelperStub::USER_ID, $order->getData('beslist_user_id'), $why);
        $this->assertSame(CookieHelperStub::VISITOR_IP, $order->getData('beslist_visitor_ip'), $why);
    }

    /**
     * @param string $why
     * @return void
     */
    private function assertNotCaptured(string $why): void
    {
        $order = $this->dispatchPlaceAfter();

        $this->assertNull($order->getData('beslist_session_id'), $why);
        $this->assertNull($order->getData('beslist_user_id'), $why);
        $this->assertNull($order->getData('beslist_visitor_ip'), $why);
    }
}
