<?php

namespace Beslist\BeslistTracking\src\API\Event;

class SessionStart extends AbstractEvent
{
    public const EVENT_NAME = 'session_start';

    /**
     * Initializes a new SessionStart event instance with the given advertiser ID, user ID, and session ID.
     *
     * @param string $advertiserID
     * @param string $userID
     * @param string $sessionID
     */
    public function __construct(string $advertiserID, string $userID, string $sessionID)
    {
        parent::__construct(self::EVENT_NAME, $advertiserID, $userID, $sessionID);
    }
}
