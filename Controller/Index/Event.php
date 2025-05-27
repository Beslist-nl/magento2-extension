<?php

namespace Beslist\BeslistTracking\Controller\Index;

use Beslist\BeslistTracking\Controller\ApiController;
use Exception;
use Magento\Framework\Controller\Result\Json;

class Event extends ApiController
{
    /**
     * Handles the incoming request to process a tracking event.
     *
     * @return Json
     */
    public function handleRequest(): Json
    {
        $requestData = $this->parseRequestData();

        try {
            $this->eventHandler->handleEvent(
                $requestData['eventName'],
                $requestData['screenWidth'],
                $requestData['screenHeight'],
                $requestData['location'] ?? [],
                $requestData['context'] ?? []
            );
        } catch (Exception $e) {
            return $this->getErrorRestResponse('Failed to handle event.');
        }

        return $this->getSuccessRestResponse();
    }
}
