<?php

namespace Beslist\BeslistTracking\src\API\Event;

use Magento\Framework\App\Request\Http;

class LocationDataFactory
{
    /** @var Http */
    private Http $request;

    /**
     * LocationDataFactory constructor.
     *
     * @param Http $request
     */
    public function __construct(
        Http $request
    ) {
        $this->request = $request;
    }

    /**
     * Creates and returns a LocationData object.
     *
     * @return LocationData
     */
    public function createLocationData(): LocationData
    {
        $locationData = new LocationData();
        $locationData->setProtocol($this->request->isSecure() ? 'https:' : 'http:');
        $locationData->setHost($this->request->getHttpHost());
        $locationData->setPath($this->request->getRequestUri());
        $locationData->setQuery($this->request->getQuery()->toString());
        $locationData->setReferrer($this->request->getServer('HTTP_REFERER', ''));

        return $locationData;
    }

    /**
     * Creates and populates a LocationData object from a raw data array.
     *
     * @param array $locationData
     * @return LocationData
     */
    public function createLocationDataFromDatabaseObject(array $locationData): LocationData
    {
        $location = $this->createLocationData();

        $location->setProtocol($locationData['protocol'] ?? '');
        $location->setHost($locationData['host'] ?? '');
        $location->setPath($locationData['path'] ?? '');
        $location->setQuery($locationData['query'] ?? '');
        $location->setHash($locationData['hash'] ?? '');
        $location->setReferrer($locationData['referrer'] ?? '');

        return $location;
    }
}
