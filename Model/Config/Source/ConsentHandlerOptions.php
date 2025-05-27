<?php

namespace Beslist\BeslistTracking\Model\Config\Source;

use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Magento\Framework\Data\OptionSourceInterface;

class ConsentHandlerOptions implements OptionSourceInterface
{
    /**
     * Returns an array of options for the consent handler select input.
     *
     * @return array
     */
    public function toOptionArray(): array
    {
        $platforms = array_map(function (array $platform) {
            return [
                'value' => $platform['handlerName'],
                'label' => $platform['name'],
            ];
        }, BeslistTrackingConfiguration::COMPATIBLE_CONSENT_MANAGEMENT_PLATFORMS);

        return array_merge([
            [
                'value' => null,
                'label' => __('None'),
            ]
        ], $platforms);
    }
}
