<?php

namespace Beslist\BeslistTracking\src\API\Event;

use Beslist\BeslistTracking\Model\EventQueue;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use DateTime;
use Exception;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\Serializer\Json;

class EventFactory
{
    /** @var HelperFunctions */
    private HelperFunctions $helperFunctions;
    /** @var ContextDataFactory */
    private ContextDataFactory $contextDataFactory;
    /** @var LocationDataFactory */
    private LocationDataFactory $locationDataFactory;
    /** @var Json */
    private Json $jsonSerializer;

    /**
     * EventFactory constructor.
     *
     * @param HelperFunctions $helperFunctions
     * @param ContextDataFactory $contextDataFactory
     * @param LocationDataFactory $locationDataFactory
     * @param Json $jsonSerializer
     */
    public function __construct(
        HelperFunctions $helperFunctions,
        ContextDataFactory $contextDataFactory,
        LocationDataFactory $locationDataFactory,
        Json $jsonSerializer
    ) {
        $this->helperFunctions = $helperFunctions;
        $this->contextDataFactory = $contextDataFactory;
        $this->locationDataFactory = $locationDataFactory;
        $this->jsonSerializer = $jsonSerializer;
    }

    /**
     * Creates and returns a SessionStart event object.
     *
     * @param string $advertiserID
     * @param string $userID
     * @param string $sessionID
     * @return SessionStart
     */
    public function createSessionStart(
        string $advertiserID,
        string $userID,
        string $sessionID
    ): SessionStart {
        $event = new SessionStart($advertiserID, $userID, $sessionID);
        $event->setEventID($event->getSessionID() . '-' . $this->helperFunctions->generateUUID());
        $event->setDateCreated(new DateTime());
        $event->setUserAgent($this->helperFunctions->getUserAgent());
        $event->setLanguage($this->helperFunctions->getVisitorLocale());

        $contextData = $this->contextDataFactory->createContextData();
        $event->setContext($contextData);

        $locationData = $this->locationDataFactory->createLocationData();
        $event->setLocation($locationData);

        return $event;
    }

    /**
     * Creates and returns a Conversion event object.
     *
     * @param string $advertiserID
     * @param string $userID
     * @param string $sessionID
     * @param float|null $value
     * @param string|null $transactionId
     * @param bool|null $includingVat
     * @return Conversion
     */
    public function createConversion(
        string $advertiserID,
        string $userID,
        string $sessionID,
        ?float $value = null,
        ?string $transactionId = null,
        ?bool $includingVat = null
    ): Conversion {
        $event = new Conversion($advertiserID, $userID, $sessionID);
        $event->setEventID($event->getSessionID() . '-' . $this->helperFunctions->generateUUID());
        $event->setDateCreated(new DateTime());
        $event->setUserAgent($this->helperFunctions->getUserAgent());
        $event->setLanguage($this->helperFunctions->getVisitorLocale());

        $contextData = $this->contextDataFactory->createContextData();
        if ($value !== null) {
            $contextData->setValue($value);
        }

        if ($transactionId !== null) {
            $contextData->setTransactionId($transactionId);
        }

        if ($includingVat !== null) {
            $contextData->setIncludingVat($includingVat);
        }

        $event->setContext($contextData);

        $locationData = $this->locationDataFactory->createLocationData();
        $event->setLocation($locationData);

        return $event;
    }

    /**
     * Creates an AbstractEvent instance from a database entity and advertiser ID, restoring all properties.
     *
     * @param EventQueue $databaseEntity
     * @param string $advertiserID
     * @return AbstractEvent
     * @throws Exception
     */
    public function createEventFromDatabaseObject(EventQueue $databaseEntity, string $advertiserID): AbstractEvent
    {
        $location = $this->locationDataFactory->createLocationDataFromDatabaseObject(
            $this->jsonSerializer->unserialize($databaseEntity->getData('location'))
        );
        $context = $this->contextDataFactory->createContextDataFromDatabaseObject(
            $this->jsonSerializer->unserialize($databaseEntity->getData('context'))
        );

        switch ($databaseEntity->getData('event_name')) {
            case SessionStart::EVENT_NAME:
                $event = $this->createSessionStart(
                    $advertiserID,
                    $databaseEntity->getData('user_uid'),
                    $databaseEntity->getData('session_uid')
                );
                break;

            case Conversion::EVENT_NAME:
                $event = $this->createConversion(
                    $advertiserID,
                    $databaseEntity->getData('user_uid'),
                    $databaseEntity->getData('session_uid'),
                    $context->getValue(),
                    $context->getTransactionId(),
                    $context->getIncludingVat()
                );
                break;

            default:
                throw new LocalizedException(__('Invalid event name: %1', $databaseEntity->getData('event_name')));
        }

        $event->setEventID($databaseEntity->getData('event_uid'));
        $event->setUserAgent($databaseEntity->getData('user_agent'));
        $event->setLanguage($databaseEntity->getData('language'));
        $event->setDateCreated(
            DateTime::createFromFormat('Y-m-d H:i:s', $databaseEntity->getData('date_created'))
        );
        $event->setScreenHeight($databaseEntity->getData('screen_height'));
        $event->setScreenWidth($databaseEntity->getData('screen_width'));
        $event->setLocation($location);
        $event->setContext($context);

        return $event;
    }
}
