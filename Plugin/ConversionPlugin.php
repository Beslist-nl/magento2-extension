<?php

namespace Beslist\BeslistTracking\Plugin;

use Beslist\BeslistTracking\Helper\SettingsHelper;
use Beslist\BeslistTracking\src\API\Event\Conversion;
use Beslist\BeslistTracking\src\API\Event\SessionStart;
use Beslist\BeslistTracking\src\EventHandler;
use Beslist\BeslistTracking\src\Helper\HelperFunctions;
use Exception;
use Magento\Sales\Model\Order;
use Psr\Log\LoggerInterface;

class ConversionPlugin
{
    /** @var LoggerInterface */
    protected LoggerInterface $logger;
    /** @var EventHandler */
    private EventHandler $eventHandler;
    /** @var SettingsHelper */
    private SettingsHelper $settingsHelper;
    /** @var HelperFunctions */
    private HelperFunctions $helper;

    /**
     * ConversionPlugin constructor.
     *
     * @param LoggerInterface $logger
     * @param EventHandler $eventHandler
     * @param SettingsHelper $settingsHelper
     * @param HelperFunctions $helper
     */
    public function __construct(
        LoggerInterface $logger,
        EventHandler    $eventHandler,
        SettingsHelper  $settingsHelper,
        HelperFunctions $helper
    ) {
        $this->logger = $logger;
        $this->eventHandler = $eventHandler;
        $this->settingsHelper = $settingsHelper;
        $this->helper = $helper;
    }

    /**
     * Sends a conversion event if tracking is enabled.
     *
     * - Checks if tracking is enabled via SettingsHelper.
     * - Attempts to retrieve session and user IDs from cookies or starts a new session event.
     * - Sends a conversion event with the order’s grand total, increment ID as transaction ID, and includes VAT.
     *
     * @param Order $subject
     * @param Order $result
     * @return Order
     */
    public function afterPlace(Order $subject, Order $result): Order
    {
        $this->logger->debug('send_conversion');

        if (!$this->settingsHelper->isTrackingEnabled()) {
            return $result;
        }

        $sessionID = null;
        $userID = null;

        if (!$this->helper->getSessionIDFromCookie()) {
            try {
                $sessionStart = $this->eventHandler->handleEvent(SessionStart::EVENT_NAME);
                $sessionID = $sessionStart->getSessionID();
                $userID = $sessionStart->getUserID();
            } catch (Exception $e) {
                $this->logger->error('Failed to handle SessionStart event during conversion tracking', [
                    'exception' => $e,
                    'order_id' => $subject->getId(),
                    'order_increment_id' => $subject->getIncrementId()
                ]);
            }
        }

        try {
            $this->eventHandler->handleEvent(
                Conversion::EVENT_NAME,
                null,
                null,
                [],
                [
                    'value' => $subject->getGrandTotal(),
                    'transaction_id' => $subject->getIncrementId(),
                    'including_vat' => true,
                ],
                $sessionID,
                $userID
            );
        } catch (Exception $e) {
            $this->logger->error('Failed to handle Conversion event during order placement', [
                'exception' => $e,
                'order_id' => $subject->getId(),
                'order_increment_id' => $subject->getIncrementId(),
                'grand_total' => $subject->getGrandTotal()
            ]);
        }

        return $result;
    }
}
