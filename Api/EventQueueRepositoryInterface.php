<?php

namespace Beslist\BeslistTracking\Api;

use Beslist\BeslistTracking\Model\EventQueue;

interface EventQueueRepositoryInterface
{
    /**
     * Saves an EventQueue entity.
     *
     * @param EventQueue $eventQueue
     * @return EventQueue
     */
    public function save(EventQueue $eventQueue): EventQueue;

    /**
     * Deletes an event from the queue by event UID.
     *
     * @param string $eventUID
     * @return void
     */
    public function delete(string $eventUID): void;

    /**
     * Retrieves an event by its unique UID.
     *
     * @param string $eventUid
     * @return EventQueue
     */
    public function getByUid(string $eventUid): EventQueue;

    /**
     * Returns the number of events queued for a user.
     *
     * @param string $userID
     * @return int
     */
    public function getEventCount(string $userID): int;

    /**
     * Retrieves a limited list of queued events for a user.
     *
     * @param string $userID
     * @param int $limit
     * @return array
     */
    public function getQueuedEvents(string $userID, int $limit = 20): array;

    /**
     * Deletes all events created before a specified date.
     *
     * @param string $dateModifier
     * @return void
     */
    public function deleteEventsBeforeDate(string $dateModifier): void;
}
