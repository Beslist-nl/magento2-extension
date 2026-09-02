<?php

namespace Beslist\BeslistTracking\Test\Integration\Stub;

use Beslist\BeslistTracking\src\Helper\HelperFunctions;

/**
 * Supplies the Beslist cookies a real browser request would carry.
 *
 * Only the cookie readers are replaced. isRequiredConsentGranted() and everything
 * else stay real, so a test using this still exercises the genuine consent logic
 * rather than a reimplementation of it.
 */
class CookieHelperStub extends HelperFunctions
{
    public const SESSION_ID = 'area-test-session-id';
    public const USER_ID = 'area-test-user-id';
    public const VISITOR_IP = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';

    /**
     * @inheritDoc
     */
    public function getSessionIDFromCookie(): ?string
    {
        return self::SESSION_ID;
    }

    /**
     * @inheritDoc
     */
    public function getUserIDFromCookie(): ?string
    {
        return self::USER_ID;
    }

    /**
     * @inheritDoc
     */
    public function getConsentFromCookie(): ?array
    {
        return [
            'consent' => ['marketing' => 'granted'],
            'handler' => 'cookie-law-info',
        ];
    }

    /**
     * @inheritDoc
     */
    public function getHashedVisitorIP(): ?string
    {
        return self::VISITOR_IP;
    }
}
