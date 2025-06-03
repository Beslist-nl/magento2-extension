<?php

namespace Beslist\BeslistTracking\src\API\Event;

class LocationData
{
    /** @var string */
    protected string $protocol = '';

    /** @var string */
    protected string $host = '';

    /** @var string */
    protected string $path = '';

    /** @var string */
    protected string $query = '';

    /** @var string */
    protected string $hash = '';

    /** @var string */
    protected string $referrer = '';

    /**
     * Gets the protocol used in the request (e.g., "http:" or "https:").
     *
     * @return string
     */
    public function getProtocol(): string
    {
        return $this->protocol;
    }

    /**
     * Sets the protocol used in the request.
     *
     * @param string $protocol
     * @return void
     */
    public function setProtocol(string $protocol): void
    {
        $this->protocol = $protocol;
    }

    /**
     * Gets the host from the request (e.g., "example.com").
     *
     * @return string
     */
    public function getHost(): string
    {
        return $this->host;
    }

    /**
     * Sets the host part of the request.
     *
     * @param string $host
     * @return void
     */
    public function setHost(string $host): void
    {
        $this->host = $host;
    }

    /**
     * Gets the path of the request URL (excluding query parameters).
     *
     * @return string
     */
    public function getPath(): string
    {
        return $this->path;
    }

    /**
     * Sets the path part of the request URL.
     *
     * @param string $path
     * @return void
     */
    public function setPath(string $path): void
    {
        $this->path = $path;
    }

    /**
     * Gets the query string from the request.
     *
     * @return string
     */
    public function getQuery(): string
    {
        return $this->query;
    }

    /**
     * Sets the query string portion of the URL.
     *
     * @param string $query
     * @return void
     */
    public function setQuery(string $query): void
    {
        $this->query = $query;
    }

    /**
     * Gets the fragment (hash) portion of the URL (after `#`).
     *
     * @return string
     */
    public function getHash(): string
    {
        return $this->hash;
    }

    /**
     * Sets the fragment (hash) portion of the URL.
     *
     * @param string $hash
     * @return void
     */
    public function setHash(string $hash): void
    {
        $this->hash = $hash;
    }

    /**
     * Gets the referring URL (the page the user came from).
     *
     * @return string
     */
    public function getReferrer(): string
    {
        return $this->referrer;
    }

    /**
     * Sets the referrer URL.
     *
     * @param string $referrer
     * @return void
     */
    public function setReferrer(string $referrer): void
    {
        $this->referrer = $referrer;
    }

    /**
     * Converts the location data to an associative array, formatted for API transmission.
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'protocol' => $this->getProtocol(),
            'host' => $this->getHost(),
            'path' => $this->getPath(),
            'query' => $this->getQuery(),
            'hash' => $this->getHash(),
            'referrer' => $this->getReferrer(),
        ];
    }
}
