<?php

namespace Beslist\BeslistTracking\Controller\Index;

use Beslist\BeslistTracking\Controller\ApiController;
use Beslist\BeslistTracking\src\API\Event\AbstractEvent;
use Magento\Framework\Controller\Result\Json;
use Throwable;

class QueuedEvents extends ApiController
{
    /**
     * Handles the incoming request to send queued events.
     *
     * @return Json
     */
    public function handleRequest(): Json
    {
        try {
            $events = $this->eventHandler->handleQueuedEvents();
        } catch (Throwable $exception) {
            return $this->getErrorRestResponse($exception->getMessage(), null, $exception->getCode());
        }

        return $this->getSuccessRestResponse('Data sent successfully.', array_map(function (AbstractEvent $event) {
            return $event->toArray();
        }, $events));
    }
}
