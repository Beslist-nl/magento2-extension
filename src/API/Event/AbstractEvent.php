<?php

namespace Beslist\BeslistTracking\src\API\Event;

use DateTime;

abstract class AbstractEvent
{
    /** @var string */
    protected string $eventName;

    /** @var DateTime */
    protected DateTime $dateCreated;

    /** @var string */
    protected string $advertiserID;

    /** @var string|null */
    protected ?string $userID;

    /** @var string|null */
    protected ?string $sessionID;

    /** @var string */
    protected string $eventID;

    /** @var string|null */
    protected ?string $screenWidth = null;

    /** @var string|null */
    protected ?string $screenHeight = null;

    /** @var string */
    protected string $userAgent;

    /** @var string|null */
    protected ?string $language = null;

    /** @var ContextData */
    public ContextData $context;

    /** @var LocationData */
    public LocationData $location;

    /**
     * AbstractEvent constructor.
     *
     * @param string $eventName
     * @param string $advertiserID
     * @param string $userID
     * @param string $sessionID
     */
    public function __construct(string $eventName, string $advertiserID, string $userID, string $sessionID)
    {
        $this->eventName = $eventName;
        $this->advertiserID = $advertiserID;
        $this->userID = $userID;
        $this->sessionID = $sessionID;
    }

    /**
     * Gets the date and time the event was created.
     *
     * @return DateTime
     */
    public function getDateCreated(): DateTime
    {
        return $this->dateCreated;
    }

    /**
     * Sets the date and time the event was created.
     *
     * @param DateTime $dateCreated
     * @return void
     */
    public function setDateCreated(DateTime $dateCreated): void
    {
        $this->dateCreated = $dateCreated;
    }

    /**
     * Returns the event's name.
     *
     * @return string
     */
    public function getEventName(): string
    {
        return $this->eventName;
    }

    /**
     * Returns the advertiser's unique ID.
     *
     * @return string
     */
    public function getAdvertiserID(): string
    {
        return $this->advertiserID;
    }

    /**
     * Returns the user's unique ID.
     *
     * @return string
     */
    public function getUserID(): string
    {
        return $this->userID;
    }

    /**
     * Returns the session's unique ID.
     *
     * @return string
     */
    public function getSessionID(): string
    {
        return $this->sessionID;
    }

    /**
     * Returns the event's unique ID.
     *
     * @return string
     */
    public function getEventID(): string
    {
        return $this->eventID;
    }

    /**
     * Sets the event's unique ID.
     *
     * @param string $eventID
     * @return void
     */
    public function setEventID(string $eventID): void
    {
        $this->eventID = $eventID;
    }

    /**
     * Returns the user agent string (truncated to 250 characters).
     *
     * @return string
     */
    public function getUserAgent(): string
    {
        return $this->userAgent;
    }

    /**
     * Sets the user agent string, truncating it to 250 characters.
     *
     * @param string $userAgent
     * @return void
     */
    public function setUserAgent(string $userAgent): void
    {
        $this->userAgent = substr($userAgent, 0, 250);
    }

    /**
     * Returns the visitor's language or locale.
     *
     * @return string|null
     */
    public function getLanguage(): ?string
    {
        return $this->language;
    }

    /**
     * Sets the visitor's language or locale.
     *
     * @param string|null $language
     * @return void
     */
    public function setLanguage(?string $language): void
    {
        $this->language = $language;
    }

    /**
     * Returns the screen width.
     *
     * @return string|null
     */
    public function getScreenWidth(): ?string
    {
        return $this->screenWidth;
    }

    /**
     * Sets the screen width.
     *
     * @param string|null $screenWidth
     * @return void
     */
    public function setScreenWidth(?string $screenWidth): void
    {
        $this->screenWidth = $screenWidth;
    }

    /**
     * Returns the screen height.
     *
     * @return string|null
     */
    public function getScreenHeight(): ?string
    {
        return $this->screenHeight;
    }

    /**
     * Sets the screen height.
     *
     * @param string|null $screenHeight
     * @return void
     */
    public function setScreenHeight(?string $screenHeight): void
    {
        $this->screenHeight = $screenHeight;
    }

    /**
     * Returns the ContextData object associated with the event.
     *
     * @return ContextData
     */
    public function getContext(): ContextData
    {
        return $this->context;
    }

    /**
     * Sets the ContextData object associated with the event.
     *
     * @param ContextData $context
     * @return void
     */
    public function setContext(ContextData $context): void
    {
        $this->context = $context;
    }

    /**
     * Returns the LocationData object associated with the event.
     *
     * @return LocationData
     */
    public function getLocation(): LocationData
    {
        return $this->location;
    }

    /**
     * Sets the LocationData object associated with the event.
     *
     * @param LocationData $location
     * @return void
     */
    public function setLocation(LocationData $location): void
    {
        $this->location = $location;
    }

    /**
     * Converts the event object to an associative array, formatted for API transmission.
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'client_bslst_eid' => $this->getEventID(),
            'event' => $this->getEventName(),
            'timestamp' => (int) (
                $this->getDateCreated()->format('U')
                * 1000
                + $this->getDateCreated()->format('u')
                / 1000
            ),
            'client_bslst_aid' => $this->getAdvertiserID(),
            'client_bslst_uid' => $this->getUserID(),
            'client_bslst_sid' => $this->getSessionID(),
            'screen_width' => $this->getScreenWidth(),
            'screen_height' => $this->getScreenHeight(),
            'user_agent' => $this->getUserAgent(),
            'language' => $this->getLanguage(),
            'location' => $this->getLocation()->toArray(),
            'context' => $this->getContext()->toArray(),
        ];
    }
}
