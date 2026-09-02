<?php

namespace Beslist\BeslistTracking\Test\Integration\Stub;

use Magento\Framework\HTTP\Client\Curl;
use OutOfBoundsException;

/**
 * Stands in for the HTTP client during integration tests.
 *
 * Registering this as the shared Curl instance intercepts the module at its only
 * outbound boundary: everything below it - observers, event handler, event
 * factory, queue - runs for real, while nothing leaves the machine. Tests can
 * dictate the response status so both the accepted and the rejected path are
 * observable.
 */
class CurlStub extends Curl
{
    /** @var array<int, array{uri: string, body: string}> */
    private array $requests = [];

    /** @var int */
    private int $responseStatus = 200;

    /** @var string */
    private string $responseBody = '';

    /**
     * Deliberately does not call the parent constructor: no cURL handle is needed.
     */
    public function __construct()
    {
    }

    /**
     * @inheritDoc
     */
    public function setHeaders($headers)
    {
    }

    /**
     * @inheritDoc
     */
    public function setTimeout($value)
    {
    }

    /**
     * @inheritDoc
     */
    public function post($uri, $params)
    {
        $this->requests[] = ['uri' => $uri, 'body' => $params];
    }

    /**
     * @inheritDoc
     */
    public function getStatus()
    {
        return $this->responseStatus;
    }

    /**
     * @inheritDoc
     */
    public function getBody()
    {
        return $this->responseBody;
    }

    /**
     * Makes the stub answer every following request with the given status.
     *
     * @param int $status
     * @param string $body
     * @return void
     */
    public function setResponseStatus(int $status, string $body = ''): void
    {
        $this->responseStatus = $status;
        $this->responseBody = $body;
    }

    /**
     * Number of requests the module attempted.
     *
     * @return int
     */
    public function getRequestCount(): int
    {
        return count($this->requests);
    }

    /**
     * The recorded requests, in the order they were attempted.
     *
     * @return array<int, array{uri: string, body: string}>
     */
    public function getRequests(): array
    {
        return $this->requests;
    }

    /**
     * The decoded payload of a recorded request.
     *
     * @param int $index
     * @return array
     */
    public function getDecodedRequest(int $index = 0): array
    {
        if (!isset($this->requests[$index])) {
            throw new OutOfBoundsException(sprintf('No request was recorded at index %d.', $index));
        }

        return json_decode($this->requests[$index]['body'], true) ?: [];
    }
}
