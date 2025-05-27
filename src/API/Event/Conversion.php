<?php

namespace Beslist\BeslistTracking\src\API\Event;

class Conversion extends AbstractEvent
{
    public const EVENT_NAME = 'conversion';

    /**
     * Constructs a new Conversion event.
     *
     * @param string $advertiserID
     * @param string $userID
     * @param string $sessionID
     */
    public function __construct(
        string $advertiserID,
        string $userID,
        string $sessionID
    ) {
        parent::__construct(self::EVENT_NAME, $advertiserID, $userID, $sessionID);
    }
}
