<?php

namespace Beslist\BeslistTracking\src;

use Beslist\BeslistTracking\Api\EventQueueRepositoryInterface;
use Beslist\BeslistTracking\Helper\SettingsHelper;
use Beslist\BeslistTracking\Model\EventQueue;
use Beslist\BeslistTracking\Model\EventQueueFactory;
use Beslist\BeslistTracking\src\API\Event\AbstractEvent;
use Beslist\BeslistTracking\src\API\Event\Conversion;
use Beslist\BeslistTracking\src\API\Event\EventFactory;
use Beslist\BeslistTracking\src\API\Event\SessionStart;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Exception;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\HTTP\Client\Curl;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Framework\Stdlib\Cookie\CookieMetadataFactory;
use Magento\Framework\Stdlib\CookieManagerInterface;
use Psr\Log\LoggerInterface;
use Throwable;

class EventHandler
{
    /** @var EventQueueFactory */
    private EventQueueFactory $eventQueueFactory;
    /** @var EventQueueRepositoryInterface */
    private EventQueueRepositoryInterface $eventQueueRepository;
    /** @var Curl */
    private Curl $curl;
    /** @var LoggerInterface */
    private LoggerInterface $logger;
    /** @var SettingsHelper */
    private SettingsHelper $settingsHelper;
    /** @var HelperFunctions */
    private HelperFunctions $helperFunctions;
    /** @var CookieMetadataFactory */
    private CookieMetadataFactory $cookieMetadataFactory;
    /** @var CookieManagerInterface */
    private CookieManagerInterface $cookieManager;
    /** @var Json */
    private Json $jsonSerializer;
    /** @var EventFactory */
    private EventFactory $eventFactory;

    /**
     * @param EventQueueFactory $eventQueueFactory
     * @param EventQueueRepositoryInterface $eventQueueRepository
     * @param Curl $curl
     * @param LoggerInterface $logger
     * @param SettingsHelper $settingsHelper
     * @param HelperFunctions $helperFunctions
     * @param CookieMetadataFactory $cookieMetadataFactory
     * @param CookieManagerInterface $cookieManager
     * @param Json $jsonSerializer
     * @param EventFactory $eventFactory
     */
    public function __construct(
        EventQueueFactory             $eventQueueFactory,
        EventQueueRepositoryInterface $eventQueueRepository,
        Curl                          $curl,
        LoggerInterface               $logger,
        SettingsHelper                $settingsHelper,
        HelperFunctions               $helperFunctions,
        CookieMetadataFactory          $cookieMetadataFactory,
        CookieManagerInterface          $cookieManager,
        Json $jsonSerializer,
        EventFactory $eventFactory
    ) {
        $this->eventQueueFactory = $eventQueueFactory;
        $this->eventQueueRepository = $eventQueueRepository;
        $this->curl = $curl;
        $this->logger = $logger;
        $this->settingsHelper = $settingsHelper;
        $this->helperFunctions = $helperFunctions;
        $this->cookieMetadataFactory = $cookieMetadataFactory;
        $this->cookieManager = $cookieManager;
        $this->jsonSerializer = $jsonSerializer;
        $this->eventFactory = $eventFactory;
    }

    /**
     * Handles the creation and sending (or queuing) of a tracking event.
     *
     * @param string $eventName
     * @param int|null $screenWidth
     * @param int|null $screenHeight
     * @param array $location
     * @param array $context
     * @param string|null $sessionID
     * @param string|null $userID
     * @return AbstractEvent
     * @throws Exception
     */
    public function handleEvent(
        string $eventName,
        ?int    $screenWidth = null,
        ?int    $screenHeight = null,
        array  $location = [],
        array  $context = [],
        ?string $sessionID = null,
        ?string $userID = null
    ): AbstractEvent {
        $advertiserID = $this->settingsHelper->getAdvertiserID();

        if (!$advertiserID) {
            throw new LocalizedException(__('Advertiser ID is not set.'));
        }

        if (!$sessionID) {
            $sessionID = $this->checkSessionIDCookie();
        }

        if (!$userID) {
            $userID = $this->checkUserIDCookie();
        }

        switch ($eventName) {
            case SessionStart::EVENT_NAME:
                $event = $this->eventFactory->createSessionStart($advertiserID, $userID, $sessionID);
                break;

            case Conversion::EVENT_NAME:
                $event = $this->eventFactory->createConversion($advertiserID, $userID, $sessionID);
                break;

            default:
                throw new LocalizedException(__('Event with name "%1" is not implemented.', $eventName));
        }

        if (isset($screenWidth)) {
            $event->setScreenWidth($screenWidth);
        }

        if (isset($screenHeight)) {
            $event->setScreenHeight($screenHeight);
        }

        if (isset($location['protocol'])) {
            $event->location->setProtocol($location['protocol']);
        }

        if (isset($location['host'])) {
            $event->location->setHost($location['host']);
        }

        if (isset($location['path'])) {
            $event->location->setPath($location['path']);
        }

        if (isset($location['query'])) {
            $event->location->setQuery($location['query']);
        }

        if (isset($location['hash'])) {
            $event->location->setHash($location['hash']);
        }

        if (isset($location['referrer'])) {
            $event->location->setReferrer($location['referrer']);
        }

        if (isset($context['sessionStartReasons'])) {
            $event->context->setSessionStartReasons($context['sessionStartReasons']);
        }

        $event->context->setServerSideUserIP($this->helperFunctions->getHashedVisitorIP());

        if (isset($context['value'])) {
            $event->context->setValue($context['value']);
        }

        if (isset($context['transaction_id'])) {
            $event->context->setTransactionId($context['transaction_id']);
        }

        if (isset($context['including_vat'])) {
            $event->context->setIncludingVat($context['including_vat']);
        }

        $consent = $this->helperFunctions->getConsentFromCookie();
        if ($consent
            && isset($consent['consent'])
            && $this->helperFunctions->isRequiredConsentGranted($consent['consent'])
        ) {
            try {
                if (!$this->sendEvent($event)) {
                    $this->queueEvent($event);
                }
            } catch (Throwable $exception) {
                $this->logger->error('Failed to send event, queued instead.', [
                    'exception' => $exception,
                ]);
                $this->queueEvent($event);
            }
        } else {
            $this->queueEvent($event);
        }

        return $event;
    }

    /**
     * @param string $userID
     * @param string $sessionID
     * @param string|null $hashedVisitorIP
     * @param string|null $userAgent
     * @param string|null $language
     * @param float $value
     * @param string $transactionID
     * @param bool $includingVat
     * @return bool True when the conversion has been handed off - either sent or queued.
     * @throws LocalizedException
     */
    public function sendConversionForOrder(
        string  $userID,
        string  $sessionID,
        ?string $hashedVisitorIP,
        ?string $userAgent,
        ?string $language,
        float   $value,
        string  $transactionID,
        bool    $includingVat = true
    ): bool {
        $advertiserID = $this->settingsHelper->getAdvertiserID();

        if (!$advertiserID) {
            throw new LocalizedException(__('Advertiser ID is not set.'));
        }

        $event = $this->eventFactory->createConversion(
            $advertiserID,
            $userID,
            $sessionID,
            $value,
            $transactionID,
            $includingVat
        );

        $event->context->setServerSideUserIP($hashedVisitorIP);

        // Replace unconditionally. The factory reads these from the current request,
        // which for a payment webhook belongs to the provider and for an admin action to
        // the operator - so an empty captured value is still more honest than that one.
        $event->setUserAgent((string) $userAgent);
        $event->setLanguage($language);

        if ($this->sendEvent($event)) {
            return true;
        }

        $this->queueEvent($event);

        return true;
    }

    /**
     * Flushes the events queued for the current visitor, once their consent allows it.
     *
     * @return array
     * @throws Exception
     */
    public function handleQueuedEvents(): array
    {
        $consent = $this->helperFunctions->getConsentFromCookie();
        if (!$consent
            || !isset($consent['consent'])
            || !$this->helperFunctions->isRequiredConsentGranted($consent['consent'])
        ) {
            return [];
        }

        $advertiserID = $this->settingsHelper->getAdvertiserID();

        if (!$advertiserID) {
            throw new LocalizedException(__('Advertiser ID is not set.'));
        }

        $userID = $this->helperFunctions->getUserIDFromCookie();

        if (!$userID) {
            throw new LocalizedException(__('User ID cookie is not set.'));
        }

        $queuedEvents = $this->getQueuedEvents($userID);
        foreach ($queuedEvents as $queuedEvent) {
            try {
                if ($this->sendEvent($queuedEvent)) {
                    $this->deleteQueuedEvent($queuedEvent);
                }
            } catch (Throwable $exception) {
                $this->logger->error('Failed to send queued event', [
                    'event_id' => $queuedEvent->getEventID(),
                    'exception' => $exception,
                ]);
            }
        }

        return $queuedEvents;
    }

    /**
     * Retrieves queued events for the given user ID and limit.
     *
     * @param string $userID
     * @param int $limit
     * @return array
     * @throws Exception
     */
    public function getQueuedEvents(string $userID, int $limit = 20): array
    {
        $queuedEvents = $this->eventQueueRepository->getQueuedEvents($userID, $limit);

        return array_map(function (EventQueue $queuedEventData) {
            return $this->eventFactory->createEventFromDatabaseObject(
                $queuedEventData,
                $this->settingsHelper->getAdvertiserID()
            );
        }, $queuedEvents);
    }

    /**
     * Checks if there are any queued events for the given user ID.
     *
     * @param string $userID
     * @return bool
     */
    public function hasQueuedEvents(string $userID): bool
    {
        return $this->eventQueueRepository->getEventCount($userID) >= 1;
    }

    /**
     * Queues the given event by storing it in the database.
     *
     * @param AbstractEvent $event
     * @return void
     */
    private function queueEvent(AbstractEvent $event): void
    {
        $item = $this->eventQueueFactory->create();
        $item->setData($this->helperFunctions->getDatabaseObjectFromEvent($event));

        $this->eventQueueRepository->save($item);
    }

    /**
     * Deletes a previously queued event by event ID.
     *
     * @param AbstractEvent $event
     * @return void
     */
    private function deleteQueuedEvent(AbstractEvent $event): void
    {
        $this->eventQueueRepository->delete($event->getEventID());
    }

    /**
     * Removes events from the queue that are older than the defined maximum age.
     *
     * @return void
     */
    public function purgeOldEvents(): void
    {
        $this->eventQueueRepository->deleteEventsBeforeDate(
            BeslistTrackingConfiguration::QUEUED_EVENT_MAX_AGE_MODIFIER
        );
    }

    /**
     * Sends a single event to the Beslist endpoint.
     *
     * @param AbstractEvent $event
     * @return bool True when the endpoint accepted the event.
     */
    private function sendEvent(AbstractEvent $event): bool
    {
        try {
            $headers = ['Content-Type' => 'application/json'];

            // The endpoint reads the user agent from the request header and overwrites
            // whatever the payload carries, so it has to travel as a header.
            if ($event->getUserAgent() !== '') {
                $headers['User-Agent'] = $event->getUserAgent();
            }

            $this->curl->setHeaders($headers);
            $this->curl->setTimeout(20);
            $this->curl->post(
                BeslistTrackingConfiguration::BESLIST_ENDPOINT_URL,
                $this->jsonSerializer->serialize($event->toArray())
            );

            $status = $this->curl->getStatus();
            if ($status !== 200) {
                $this->logger->warning("Failed to send event. HTTP Status: $status. Body: " . $this->curl->getBody());
                return false;
            }
        } catch (Exception $e) {
            $this->logger->error('Error while sending event: ' . $e->getMessage());
            return false;
        }

        return true;
    }

    /**
     * Checks for an existing session ID cookie or sets a new one if missing.
     *
     * @return string
     */
    private function checkSessionIDCookie(): string
    {
        $sessionID = $this->helperFunctions->getSessionIDFromCookie();

        if (!$sessionID) {
            $sessionID = $this->helperFunctions->generateUUID();
        }

        $cookieMetadata = $this->cookieMetadataFactory
            ->createPublicCookieMetadata()
            ->setDuration(BeslistTrackingConfiguration::SESSION_ID_COOKIE_LIFETIME)
            ->setPath('/')
            ->setSecure(true)
            ->setHttpOnly(false);

        try {
            $this->cookieManager->setPublicCookie(
                BeslistTrackingConfiguration::SESSION_ID_COOKIE_NAME,
                $sessionID,
                $cookieMetadata
            );
        } catch (Throwable $e) {
            $this->logger->error('Failed to set session ID cookie', [
                'exception' => $e,
            ]);
        }

        return $sessionID;
    }

    /**
     * Checks for an existing user ID cookie or sets a new one if missing.
     *
     * @return string
     */
    private function checkUserIDCookie(): string
    {
        $userID = $this->helperFunctions->getUserIDFromCookie();

        if (!$userID) {
            $userID = $this->helperFunctions->generateUUID(true);
        }

        $cookieMetadata = $this->cookieMetadataFactory
            ->createPublicCookieMetadata()
            ->setDuration(BeslistTrackingConfiguration::USER_ID_COOKIE_LIFETIME)
            ->setPath('/')
            ->setSecure(true)
            ->setHttpOnly(true);

        try {
            $this->cookieManager->setPublicCookie(
                BeslistTrackingConfiguration::USER_ID_COOKIE_NAME,
                $userID,
                $cookieMetadata
            );
        } catch (Throwable $e) {
            $this->logger->error('Failed to set user ID cookie', [
                'exception' => $e,
            ]);
        }

        return $userID;
    }
}
