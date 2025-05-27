<?php

namespace Beslist\BeslistTracking\Model;

use Beslist\BeslistTracking\Api\EventQueueRepositoryInterface;
use Beslist\BeslistTracking\Model\ResourceModel\EventQueue as EventQueueResource;
use Beslist\BeslistTracking\Model\ResourceModel\EventQueue\CollectionFactory;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use DateTime;
use Exception;
use Magento\Framework\App\ResourceConnection;
use Magento\Framework\Exception\LocalizedException;

class EventQueueRepository implements EventQueueRepositoryInterface
{
    /** @var EventQueueFactory */
    protected EventQueueFactory $factory;
    /** @var EventQueueResource */
    protected EventQueueResource $resource;
    /** @var CollectionFactory */
    private CollectionFactory $collectionFactory;
    /** @var ResourceConnection */
    private ResourceConnection $resourceConnection;

    /**
     * EventQueueRepository constructor.
     *
     * @param EventQueueFactory $factory
     * @param EventQueueResource $resource
     * @param CollectionFactory $collectionFactory
     * @param ResourceConnection $resourceConnection
     */
    public function __construct(
        EventQueueFactory  $factory,
        EventQueueResource $resource,
        CollectionFactory  $collectionFactory,
        ResourceConnection $resourceConnection
    ) {
        $this->factory = $factory;
        $this->resource = $resource;
        $this->collectionFactory = $collectionFactory;
        $this->resourceConnection = $resourceConnection;
    }

    /**
     * Saves an EventQueue entity.
     *
     * @param EventQueue $eventQueue
     * @return EventQueue
     * @throws LocalizedException
     */
    public function save(EventQueue $eventQueue): EventQueue
    {
        try {
            $this->resource->save($eventQueue);
        } catch (Exception $e) {
            throw new LocalizedException(__('Could not save event: %1', $e->getMessage()));
        }

        return $eventQueue;
    }

    /**
     * Deletes an event from the queue by event UID.
     *
     * @param string $eventUID
     * @return void
     * @throws Exception
     */
    public function delete(string $eventUID): void
    {
        $model = $this->factory->create();
        $this->resource->load($model, $eventUID, 'event_uid');

        if ($model->getId()) {
            $this->resource->delete($model);
        }
    }

    /**
     * Retrieves an event by its unique UID.
     *
     * @param string $eventUid
     * @return EventQueue
     */
    public function getByUid(string $eventUid): EventQueue
    {
        $event = $this->factory->create();
        $this->resource->load($event, $eventUid, 'event_uid');
        return $event;
    }

    /**
     * Returns the number of events queued for a user.
     *
     * @param string $userID
     * @return int
     */
    public function getEventCount(string $userID): int
    {
        $collection = $this->collectionFactory->create();
        $collection->addFieldToFilter('user_uid', $userID);
        return $collection->getSize();
    }

    /**
     * Retrieves a limited list of queued events for a user.
     *
     * @param string $userID
     * @param int $limit
     * @return array
     */
    public function getQueuedEvents(string $userID, int $limit = 20): array
    {
        $collection = $this->collectionFactory->create();
        $collection->addFieldToFilter('user_uid', $userID);
        $collection->setPageSize($limit); // Set limit
        $collection->setCurPage(1);
        return $collection->getItems();
    }

    /**
     * Deletes all events created before a specified date.
     *
     * @param string $dateModifier
     * @return void
     */
    public function deleteEventsBeforeDate(string $dateModifier): void
    {
        $connection = $this->resourceConnection->getConnection();
        $tableName = $this->resourceConnection->getTableName(BeslistTrackingConfiguration::EVENT_QUEUE_TABLE_NAME);

        $expirationDate = (new DateTime('now'))->modify($dateModifier);
        $formattedDate = $expirationDate->format('Y-m-d H:i:s');

        $where = ['date_created < ?' => $formattedDate];
        $connection->delete($tableName, $where);
    }
}
