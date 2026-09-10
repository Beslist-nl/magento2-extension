<?php

namespace Beslist\BeslistTracking\Test\Integration\Observer;

use Beslist\BeslistTracking\Api\EventQueueRepositoryInterface;
use Beslist\BeslistTracking\Observer\ConversionObserver;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Beslist\BeslistTracking\src\EventHandler;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Beslist\BeslistTracking\Test\Integration\Stub\CurlStub;
use Laminas\Stdlib\Parameters;
use Magento\Framework\App\ResourceConnection;
use Magento\Framework\App\Request\Http;
use Magento\Framework\HTTP\Client\Curl;
use Magento\Sales\Api\OrderRepositoryInterface;
use Magento\Sales\Model\Order;
use Magento\TestFramework\Helper\Bootstrap;
use Magento\TestFramework\ObjectManager;
use PHPUnit\Framework\TestCase;

/**
 * Covers the rule the conversion reporting rests on: report a conversion once,
 * and only once the order has actually been paid.
 *
 * Before this was observer-based, the conversion was sent from a plugin on
 * Order::place(), which for redirect payment providers runs before the customer
 * has paid - so cancelled and failed payments were reported as conversions. The
 * first test here is that regression.
 *
 * @magentoDbIsolation enabled
 */
class ConversionObserverTest extends TestCase
{
    private const INCREMENT_ID = '100000001';
    private const ADVERTISER_ID = '4321';
    private const SESSION_ID = 'test-session-id';
    private const USER_ID = 'test-user-id';
    /** Hashed IPs are SHA-256, so use something of the right shape. */
    private const VISITOR_IP = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';
    private const USER_AGENT = 'Mozilla/5.0 (Test) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';
    private const LANGUAGE = 'nl-NL';
    /** The core fixture uses checkmo, which is offline and so reports at placement. */
    private const REDIRECT_METHOD = 'paypal_express';
    private const OFFLINE_METHOD = 'checkmo';
    private const HOST = 'browsed.example.com';
    private const REFERRER = 'https://shop.example.com/checkout/';

    /** @var ObjectManager */
    private $objectManager;
    /** @var CurlStub */
    private $curl;
    /** @var OrderRepositoryInterface */
    private $orderRepository;
    /** @var string */
    private $paymentMethod = self::REDIRECT_METHOD;

    protected function setUp(): void
    {
        $this->objectManager = Bootstrap::getObjectManager();
        $this->curl = new CurlStub();

        // Intercept at the HTTP boundary only; the rest of the module runs for real.
        $this->objectManager->addSharedInstance($this->curl, Curl::class);
        $this->forgetTrackingInstances();

        $this->orderRepository = $this->objectManager->get(OrderRepositoryInterface::class);
        $this->paymentMethod = self::REDIRECT_METHOD;
    }

    protected function tearDown(): void
    {
        $this->objectManager->removeSharedInstance(Curl::class);
        $this->forgetTrackingInstances();
    }

    /**
     * An order still waiting for payment must not be reported - this is the
     * cancelled iDEAL case that the old Order::place() plugin got wrong.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testDoesNotReportOrderAwaitingPayment(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);

        $this->assertSame(
            0,
            $this->curl->getRequestCount(),
            'An order awaiting payment must not be reported as a conversion.'
        );
        $this->assertSame(
            0,
            (int) $this->loadOrder()->getData('beslist_conversion_sent'),
            'An unpaid order must not be flagged as reported.'
        );
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testReportsConversionOnceOrderIsPaid(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->assertSame(0, $this->curl->getRequestCount(), 'Nothing may be sent before payment.');

        $this->saveOrderInState(Order::STATE_PROCESSING);

        $this->assertSame(1, $this->curl->getRequestCount(), 'A paid order must be reported exactly once.');

        $request = $this->curl->getRequests()[0];
        $this->assertSame(BeslistTrackingConfiguration::BESLIST_ENDPOINT_URL, $request['uri']);

        $payload = $this->curl->getDecodedRequest();
        $this->assertSame('conversion', $payload['event']);
        $this->assertSame(self::ADVERTISER_ID, $payload['client_bslst_aid']);
        $this->assertSame(self::INCREMENT_ID, $payload['context']['transaction_id']);
        $this->assertEquals(100, $payload['context']['value']);
        $this->assertSame('true', $payload['context']['including_vat']);

        // The identifiers must come off the order, not out of the request that
        // confirmed the payment - which for a webhook has no Beslist cookies.
        $this->assertSame(self::SESSION_ID, $payload['client_bslst_sid']);
        $this->assertSame(self::USER_ID, $payload['client_bslst_uid']);
        $this->assertSame(self::VISITOR_IP, $payload['context']['server_side_user_ip']);

        // The receiver overwrites the payload's user agent from the request header, so
        // the captured value only survives if it is sent as a header.
        $this->assertSame(
            self::USER_AGENT,
            $this->curl->getRequestHeaders()['User-Agent'] ?? null,
            'The captured user agent must be sent as a request header, not only in the payload.'
        );
        $this->assertSame(self::USER_AGENT, $payload['user_agent']);
        $this->assertSame(self::LANGUAGE, $payload['language']);

        $this->assertSame(
            1,
            (int) $this->loadOrder()->getData('beslist_conversion_sent'),
            'A reported order must be flagged so it is not reported again.'
        );
    }

    /**
     * Payment providers retry their webhooks, and any admin action saves the
     * order again; neither may produce a second conversion.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testDoesNotReportTheSameOrderTwice(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->saveOrderInState(Order::STATE_PROCESSING);
        $this->assertSame(1, $this->curl->getRequestCount());

        $order = $this->loadOrder();
        $order->addCommentToStatusHistory('Second save, as a replayed payment webhook would cause.');
        $this->orderRepository->save($order);

        $this->assertSame(
            1,
            $this->curl->getRequestCount(),
            'Saving a reported order again must not report it a second time.'
        );
    }

    /**
     * Orders placed without Beslist identifiers - admin orders, or a visitor who
     * did not arrive through Beslist - have nothing to attribute.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testDoesNotReportOrderWithoutBeslistSession(): void
    {
        // The fixture order is already in processing, so only the missing
        // session identifier can keep this from being reported.
        $order = $this->loadOrder();
        $this->assertSame(Order::STATE_PROCESSING, $order->getState());

        $order->addCommentToStatusHistory('Paid, but not attributable to Beslist.');
        $this->orderRepository->save($order);

        $this->assertSame(
            0,
            $this->curl->getRequestCount(),
            'An order without a captured Beslist session must not be reported.'
        );
    }

    /**
     * A rejected send is kept in the queue rather than dropped, and the order is
     * still flagged - retrying the direct send on a later save would report the
     * same order twice.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testQueuesConversionWhenTheEndpointRejectsIt(): void
    {
        $this->curl->setResponseStatus(500, 'Internal Server Error');

        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->saveOrderInState(Order::STATE_PROCESSING);

        $this->assertSame(1, $this->curl->getRequestCount(), 'The conversion must have been attempted.');

        $queue = $this->objectManager->get(EventQueueRepositoryInterface::class);
        $this->assertSame(
            1,
            $queue->getEventCount(self::USER_ID),
            'A rejected conversion must be queued instead of dropped.'
        );
        $this->assertSame(
            1,
            (int) $this->loadOrder()->getData('beslist_conversion_sent'),
            'A queued conversion counts as handed off, so the order must not be reported again.'
        );
    }

    /**
     * Tracking switched off must keep the module silent, whatever the order does.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 0
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testReportsNothingWhenTrackingIsDisabled(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->saveOrderInState(Order::STATE_PROCESSING);

        $this->assertSame(0, $this->curl->getRequestCount(), 'Disabled tracking must send nothing.');
    }

    /**
     * A bank transfer or an invoice paid later settles outside the shop, so payment can never be
     * confirmed here and the order is reported as placed.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testReportsAnOfflineOrderWithoutWaitingForPayment(): void
    {
        $this->paymentMethod = self::OFFLINE_METHOD;

        $this->saveOrderInState(Order::STATE_NEW, true);

        $this->assertSame(
            1,
            $this->curl->getRequestCount(),
            'An offline order must be reported at placement - its payment is never confirmed here.'
        );
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     */
    public function testDoesNotReportACancelledOfflineOrder(): void
    {
        $this->paymentMethod = self::OFFLINE_METHOD;

        $this->saveOrderInState(Order::STATE_CANCELED, true);

        $this->assertSame(0, $this->curl->getRequestCount(), 'A cancelled order must never be reported.');
    }

    /**
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store web/secure/base_url https://shop.example.com/
     */
    public function testReportsTheShopsOwnHostRatherThanTheConfirmingRequestsHost(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->saveOrderInState(Order::STATE_PROCESSING);

        $this->assertSame(1, $this->curl->getRequestCount(), 'The conversion must have been sent.');

        $this->assertSame(
            self::HOST,
            $this->curl->getDecodedRequest()['location']['host'] ?? null,
            'The conversion must report the host captured at placement, not the confirming request.'
        );
    }

    /**
     * The confirming request's path and query carry admin secret keys and callback tokens, so only
     * the referrer captured at placement is reported.
     *
     * @magentoDataFixture Magento/Sales/_files/order.php
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/enable_tracking 1
     * @magentoConfigFixture current_store beslist_tracking_tracking/tracking_settings/advertiser_id 4321
     * @magentoConfigFixture current_store web/secure/base_url https://shop.example.com/
     */
    public function testReportsThePlacementReferrerAndOmitsTheConfirmingRequestsPath(): void
    {
        $this->saveOrderInState(Order::STATE_PENDING_PAYMENT, true);
        $this->saveOrderInState(Order::STATE_PROCESSING);

        $location = $this->curl->getDecodedRequest()['location'] ?? [];

        $this->assertSame(self::REFERRER, $location['referrer'] ?? null, 'The captured referrer must be reported.');
        $this->assertSame('', $location['path'] ?? null, 'The confirming request path must not be reported.');
        $this->assertSame('', $location['query'] ?? null, 'The confirming request query must not be reported.');
    }

    /**
     * The user agent arrives in a request header a client controls, with no length limit, and is
     * stored in two columns - the order and the narrower event queue. It is therefore clamped on
     * read, so no write site can be handed a value that does not fit. Magento's own connection
     * reports an empty sql_mode and would trim silently, but a shop running in strict mode would
     * reject the insert instead - mid-checkout for the order, and losing the event for the queue.
     */
    public function testClampsAnOversizedUserAgentOnRead(): void
    {
        $request = $this->objectManager->create(Http::class);
        $request->setServer(new Parameters(['HTTP_USER_AGENT' => str_repeat('U', 300)]));

        $helper = $this->objectManager->create(HelperFunctions::class, ['request' => $request]);

        $this->assertSame(
            BeslistTrackingConfiguration::USER_AGENT_MAX_LENGTH,
            mb_strlen($helper->getUserAgent()),
            'An oversized user agent must be clamped to the stored column width on read.'
        );
    }

    /**
     * Guards the clamp against the schema drifting away from it. sales_order.beslist_user_agent was
     * introduced at 255 while the pre-existing queue column is 250, so a 251-255 character agent
     * passed the order write and could still overflow the queue. Fails if either column is
     * narrowed, or if the clamp is raised past what a column can hold.
     */
    public function testUserAgentClampFitsEveryColumnItIsStoredIn(): void
    {
        $resource = $this->objectManager->get(ResourceConnection::class);
        $connection = $resource->getConnection();

        $columns = [
            [$resource->getTableName('sales_order'), 'beslist_user_agent'],
            [$resource->getTableName(BeslistTrackingConfiguration::EVENT_QUEUE_TABLE_NAME), 'user_agent'],
        ];

        foreach ($columns as [$table, $column]) {
            $described = $connection->describeTable($table);

            $this->assertArrayHasKey($column, $described, sprintf('%s.%s is missing.', $table, $column));
            $this->assertGreaterThanOrEqual(
                BeslistTrackingConfiguration::USER_AGENT_MAX_LENGTH,
                (int) $described[$column]['LENGTH'],
                sprintf(
                    '%s.%s is narrower than the clamp, so a clamped value can still overflow it.',
                    $table,
                    $column
                )
            );
        }
    }

    /**
     * Drops the shared instances holding the HTTP client, so the event handler
     * and the observer are rebuilt around the stub.
     *
     * @return void
     */
    private function forgetTrackingInstances(): void
    {
        $this->objectManager->removeSharedInstance(EventHandler::class);
        $this->objectManager->removeSharedInstance(ConversionObserver::class);
    }

    /**
     * @return Order
     */
    private function loadOrder(): Order
    {
        return $this->objectManager->create(Order::class)->loadByIncrementId(self::INCREMENT_ID);
    }

    /**
     * Moves the fixture order into the given state and saves it, which is what
     * dispatches sales_order_save_after.
     *
     * @param string $state
     * @param bool $withTrackingData Attach the identifiers the persist observer
     *                               would have captured while the customer was on-site.
     * @return void
     */
    private function saveOrderInState(string $state, bool $withTrackingData = false): void
    {
        $order = $this->loadOrder();

        if ($withTrackingData) {
            $order->setData('beslist_session_id', self::SESSION_ID);
            $order->setData('beslist_user_id', self::USER_ID);
            $order->setData('beslist_visitor_ip', self::VISITOR_IP);
            $order->setData('beslist_user_agent', self::USER_AGENT);
            $order->setData('beslist_language', self::LANGUAGE);
            $order->setData('beslist_host', self::HOST);
            $order->setData('beslist_referrer', self::REFERRER);
        }

        $order->getPayment()->setMethod($this->paymentMethod);

        $order->setState($state)
            ->setStatus($order->getConfig()->getStateDefaultStatus($state));

        $this->orderRepository->save($order);
    }
}
