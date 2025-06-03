<?php

namespace Beslist\BeslistTracking\src\Helper;

use Beslist\BeslistTracking\src\API\Event\AbstractEvent;
use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Exception;
use Magento\Framework\App\Request\Http;
use Magento\Framework\Serialize\Serializer\Json;

class HelperFunctions
{
    /** @var Http */
    private Http $request;
    /** @var LocaleDetector */
    private LocaleDetector $localeDetector;
    /** @var Json */
    private Json $jsonSerializer;

    /**
     * HelperFunctions constructor.
     *
     * @param Http $request
     * @param LocaleDetector $localeDetector
     * @param Json $jsonSerializer
     */
    public function __construct(
        Http $request,
        LocaleDetector $localeDetector,
        Json $jsonSerializer
    ) {
        $this->request = $request;
        $this->localeDetector = $localeDetector;
        $this->jsonSerializer = $jsonSerializer;
    }

    /**
     * Retrieves the session ID from the tracking cookie, if present.
     *
     * @return string|null
     */
    public function getSessionIDFromCookie(): ?string
    {
        $cookieValue = $this->request->getCookie(BeslistTrackingConfiguration::SESSION_ID_COOKIE_NAME);

        if (empty($cookieValue)) {
            return null;
        }

        return $cookieValue;
    }

    /**
     * Retrieves the user ID from the tracking cookie, if present.
     *
     * @return string|null
     */
    public function getUserIDFromCookie(): ?string
    {
        $cookieValue = $this->request->getCookie(BeslistTrackingConfiguration::USER_ID_COOKIE_NAME);

        if (empty($cookieValue)) {
            return null;
        }

        return $cookieValue;
    }

    /**
     * Retrieves and decodes the consent data from the consent cookie.
     *
     * @throws Exception
     */
    public function getConsentFromCookie(): ?array
    {
        $cookieValue = $this->request->getCookie(BeslistTrackingConfiguration::CONSENT_COOKIE_NAME);

        if (empty($cookieValue)) {
            return null;
        }

        return $this->jsonSerializer->unserialize($cookieValue);
    }

    /**
     * Detects the visitor's locale using the configured locale detector.
     *
     * @return string
     */
    public function getVisitorLocale(): string
    {
        $locales = $this->localeDetector->detect();

        if (empty($locales)) {
            return '';
        }

        return $locales[0];
    }

    /**
     * Retrieves the user agent.
     *
     * @return string
     */
    public function getUserAgent(): string
    {
        return $this->request->getServer('HTTP_USER_AGENT') ?? '';
    }

    /**
     * Retrieves and hashes the visitor's IP address using SHA-256.
     *
     * @return string|null
     */
    public function getHashedVisitorIP(): ?string
    {
        $ip = $this->request->getClientIp();

        if (!$ip) {
            return null;
        }

        return hash('sha256', $ip);
    }

    /**
     * Converts the event object into an associative array, formatted for database storage.
     *
     * @param AbstractEvent $event
     * @return array
     */
    public function getDatabaseObjectFromEvent(AbstractEvent $event): array
    {
        return [
            'event_uid' => $event->getEventID(),
            'date_created' => $event->getDateCreated()->format('Y-m-d H:i:s'),
            'event_name' => $event->getEventName(),
            'user_uid' => $event->getUserID(),
            'session_uid' => $event->getSessionID(),
            'user_agent' => $event->getUserAgent(),
            'language' => $event->getLanguage() ?: null,
            'screen_height' => $event->getScreenHeight(),
            'screen_width' => $event->getScreenWidth(),
            'location' => $this->jsonSerializer->serialize($event->getLocation()->toArray()),
            'context' => $this->jsonSerializer->serialize($event->getContext()->toArray()),
        ];
    }

    /**
     * Generates a pseudo-random UUID.
     *
     * @param bool $includeDateSuffix
     * @param string $separator
     * @return string
     */
    public function generateUUID(bool $includeDateSuffix = false, string $separator = '.'): string
    {
        $uuid = floor(100000000 + (rand(0, getrandmax()) / getrandmax()) * 900000000);

        if ($includeDateSuffix) {
            $uuid .= $separator . round(microtime(true) * 1000);
        }

        return $uuid;
    }
}
