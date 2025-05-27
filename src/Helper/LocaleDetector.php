<?php

namespace Beslist\BeslistTracking\src\Helper;

use Magento\Framework\App\Request\Http;

class LocaleDetector
{
    private const HTTP_ACCEPT_LANGUAGE_HEADER_KEY = 'HTTP_ACCEPT_LANGUAGE';

    /** @var Http */
    private Http $request;

    /**
     * LocaleDetector constructor.
     *
     * @param Http $request
     */
    public function __construct(
        Http $request
    ) {
        $this->request = $request;
    }

    /**
     * Detects and returns a list of preferred locales based on the `Accept-Language` HTTP header.
     *
     * @return array
     */
    public function detect(): array
    {
        $httpAcceptLanguageHeader = $this->getHttpAcceptLanguageHeader();
        if ($httpAcceptLanguageHeader == null) {
            return [];
        }
        $locales = $this->getWeightedLocales($httpAcceptLanguageHeader);
        $sortedLocales = $this->sortLocalesByWeight($locales);
        return array_map(function ($weightedLocale) {
            return $weightedLocale['locale'];
        }, $sortedLocales);
    }

    /**
     * Retrieves the `Accept-Language` HTTP header from the server environment.
     *
     * @return string|null
     */
    private function getHttpAcceptLanguageHeader(): ?string
    {
        $httAcceptLanguageHeader = $this->request->getServer(self::HTTP_ACCEPT_LANGUAGE_HEADER_KEY);

        if (isset($httAcceptLanguageHeader)) {
            return trim($httAcceptLanguageHeader);
        } else {
            return null;
        }
    }

    /**
     * Parses the `Accept-Language` header into an array of locale entries with weights.
     *
     * @param string $httpAcceptLanguageHeader
     * @return array
     */
    private function getWeightedLocales(string $httpAcceptLanguageHeader): array
    {
        if (strlen($httpAcceptLanguageHeader) == 0) {
            return [];
        }
        $weightedLocales = [];
        foreach (explode(',', $httpAcceptLanguageHeader) as $locale) {
            $localeParts = explode(';', $locale);
            $weightedLocale = ['locale' => $localeParts[0]];
            if (count($localeParts) == 2) {
                $weightParts = explode('=', $localeParts[1]);
                $weightedLocale['q'] = floatval($weightParts[1]);
            } else {
                $weightedLocale['q'] = 1.0;
            }
            $weightedLocales[] = $weightedLocale;
        }
        return $weightedLocales;
    }

    /**
     * Sorts the weighted locales in descending order of their preference weight.
     *
     * @param array $locales
     * @return array
     */
    private function sortLocalesByWeight(array $locales): array
    {
        usort($locales, function ($a, $b) {
            if ($a['q'] == $b['q']) {
                return 0;
            }
            if ($a['q'] > $b['q']) {
                return -1;
            }
            return 1;
        });
        return $locales;
    }
}
