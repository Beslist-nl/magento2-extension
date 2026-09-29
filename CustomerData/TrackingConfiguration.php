<?php

namespace Beslist\BeslistTracking\CustomerData;

use Beslist\BeslistTracking\Helper\ConsentHelper;
use Beslist\BeslistTracking\Model\OrderReportability;
use Beslist\BeslistTracking\Observer\SuccessPageObserver;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Beslist\BeslistTracking\src\EventHandler;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Customer\CustomerData\SectionSourceInterface;
use Beslist\BeslistTracking\Helper\SettingsHelper;
use Magento\Framework\Exception\LocalizedException;
use Magento\Sales\Model\Order;
use Magento\Framework\Session\SessionManagerInterface;
use Magento\Sales\Model\ResourceModel\Order as OrderResource;
use Psr\Log\LoggerInterface;
use Throwable;

class TrackingConfiguration implements SectionSourceInterface
{
    /** @var SettingsHelper */
    protected SettingsHelper $settingsHelper;
    /** @var EventHandler */
    private EventHandler $eventHandler;
    /** @var ConsentHelper */
    private ConsentHelper $consentHelper;
    /** @var HelperFunctions */
    private HelperFunctions $helperFunctions;
    /** @var CheckoutSession */
    private CheckoutSession $checkoutSession;
    /** @var OrderReportability */
    private OrderReportability $orderReportability;
    /** @var OrderResource */
    private OrderResource $orderResource;
    /** @var LoggerInterface */
    private LoggerInterface $logger;
    /** @var SessionManagerInterface */
    private SessionManagerInterface $session;

    /**
     * TrackingConfiguration constructor.
     *
     * @param SettingsHelper $settingsHelper
     * @param EventHandler $eventHandler
     * @param ConsentHelper $consentHelper
     * @param HelperFunctions $helperFunctions
     * @param CheckoutSession $checkoutSession
     * @param OrderReportability $orderReportability
     * @param OrderResource $orderResource
     * @param LoggerInterface $logger
     * @param SessionManagerInterface $session
     */
    public function __construct(
        SettingsHelper $settingsHelper,
        EventHandler   $eventHandler,
        ConsentHelper  $consentHelper,
        HelperFunctions $helperFunctions,
        CheckoutSession $checkoutSession,
        OrderReportability $orderReportability,
        OrderResource $orderResource,
        LoggerInterface $logger,
        SessionManagerInterface $session
    ) {
        $this->settingsHelper = $settingsHelper;
        $this->eventHandler = $eventHandler;
        $this->consentHelper = $consentHelper;
        $this->helperFunctions = $helperFunctions;
        $this->checkoutSession = $checkoutSession;
        $this->orderReportability = $orderReportability;
        $this->orderResource = $orderResource;
        $this->logger = $logger;
        $this->session = $session;
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
            'advertiserID' => $this->settingsHelper->getAdvertiserID(),
            'pluginVersion' => BeslistTrackingConfiguration::BESLIST_TRACKING_VERSION,
            'cookielessPingsEnabled' => $this->settingsHelper->areCookielessPingsEnabled(),
            'conversionData' => $this->getConversionData(),
        ];
    }

    /**
     * The conversion the browser should ping for, if it has not been given one yet.
     *
     * Handing the data out flags the order, so reloading the success page cannot ping twice - the
     * flag therefore records "given to a browser", not "delivered".
     *
     * @return array|null
     */
    private function getConversionData(): ?array
    {
        try {
            if (!$this->settingsHelper->areCookielessPingsEnabled()) {
                return null;
            }

            $this->session->start();
            $confirmedIncrementId = $this->session->getData(SuccessPageObserver::SESSION_KEY);

            if (!$confirmedIncrementId) {
                return null;
            }

            // Consumed whatever happens next, so a later page view neither re-offers nor reloads
            // the order. A success-page reload sets it again; the order flag stops a second ping.
            $this->session->unsetData(SuccessPageObserver::SESSION_KEY);

            /** @var Order $order */
            $order = $this->checkoutSession->getLastRealOrder();

            if (!$order->getId()
                || $order->getIncrementId() !== $confirmedIncrementId
                || (int) $order->getData('beslist_ping_sent') === 1
            ) {
                return null;
            }

            if (!$this->orderReportability->isCountable($order)) {
                return null;
            }

            $order->setData('beslist_ping_sent', 1);
            $this->orderResource->saveAttribute($order, 'beslist_ping_sent');

            return [
                'value' => (float) $order->getGrandTotal(),
                'transactionID' => (string) $order->getIncrementId(),
                'includingVAT' => true,
            ];
        } catch (Throwable $e) {
            $this->logger->error('Failed to resolve the Beslist conversion ping data', [
                'exception' => $e,
            ]);

            return null;
        }
    }
}
