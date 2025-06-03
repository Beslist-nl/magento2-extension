<?php

namespace Beslist\BeslistTracking\src\API\Event;

class ContextDataFactory
{
    /**
     * Creates and returns a ContextData object.
     *
     * @return ContextData
     */
    public function createContextData(): ContextData
    {
        return new ContextData();
    }

    /**
     * Creates and populates a ContextData object from a raw data array.
     *
     * @param array $contextData
     * @return ContextData
     */
    public function createContextDataFromDatabaseObject(array $contextData): ContextData
    {
        $context = $this->createContextData();

        if (!empty($contextData['shop_session_start_reasons'])) {
            $context->setSessionStartReasons($contextData['shop_session_start_reasons']);
        }

        if (!empty($contextData['server_side_user_ip'])) {
            $context->setServerSideUserIP($contextData['server_side_user_ip']);
        }

        if (!empty($contextData['value'])) {
            $context->setValue($contextData['value']);
        }

        if (!empty($contextData['transaction_id'])) {
            $context->setTransactionId($contextData['transaction_id']);
        }

        if (!empty($contextData['including_vat'])) {
            $context->setIncludingVat($contextData['including_vat']);
        }

        return $context;
    }
}
