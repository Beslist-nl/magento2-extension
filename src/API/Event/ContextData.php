<?php

namespace Beslist\BeslistTracking\src\API\Event;

use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;

class ContextData
{
    /** @var string|null */
    protected ?string $sessionStartReasons = null;

    /** @var string|null */
    protected ?string $serverSideUserIP = null;

    /** @var string|null */
    protected ?string $value = null;

    /** @var string|null */
    protected ?string $transactionId = null;

    /** @var bool|null */
    protected ?bool $includingVat = null;

    /**
     * Gets the reason(s) why a session must be initiated.
     *
     * @return string|null
     */
    public function getSessionStartReasons(): ?string
    {
        return $this->sessionStartReasons;
    }

    /**
     * Sets the reason(s) why the session must be initiated.
     *
     * @param string|null $sessionStartReasons
     * @return void
     */
    public function setSessionStartReasons(?string $sessionStartReasons): void
    {
        $this->sessionStartReasons = $sessionStartReasons;
    }

    /**
     * Gets the anonymized or hashed IP address of the user, as captured server-side.
     *
     * @return string|null
     */
    public function getServerSideUserIP(): ?string
    {
        return $this->serverSideUserIP;
    }

    /**
     * Sets the server-side captured IP address of the user.
     *
     * @param string|null $serverSideUserIP
     * @return void
     */
    public function setServerSideUserIP(?string $serverSideUserIP): void
    {
        $this->serverSideUserIP = $serverSideUserIP;
    }

    /**
     * Gets the value associated with the event (e.g., transaction amount).
     *
     * @return string|null
     */
    public function getValue(): ?string
    {
        return $this->value;
    }

    /**
     * Sets the value associated with the event (e.g., transaction amount).
     *
     * @param string|null $value
     * @return void
     */
    public function setValue(?string $value): void
    {
        $this->value = $value;
    }

    /**
     * Gets the transaction ID related to the event.
     *
     * @return string|null
     */
    public function getTransactionId(): ?string
    {
        return $this->transactionId;
    }

    /**
     * Sets the transaction ID associated with the event.
     *
     * @param string|null $transactionId
     * @return void
     */
    public function setTransactionId(?string $transactionId): void
    {
        $this->transactionId = $transactionId;
    }

    /**
     * Gets whether the event's value includes VAT.
     *
     * @return bool|null
     */
    public function getIncludingVat(): ?bool
    {
        return $this->includingVat;
    }

    /**
     * Sets whether the event's value includes VAT.
     *
     * @param bool|null $includingVat
     * @return void
     */
    public function setIncludingVat(?bool $includingVat): void
    {
        $this->includingVat = $includingVat;
    }

    /**
     * Converts the context data to an associative array, formatted for API transmission.
     *
     * @return string[]
     */
    public function toArray(): array
    {
        $data = [
            'implementation_type' => 'magento_plugin-' . BeslistTrackingConfiguration::BESLIST_TRACKING_VERSION,
        ];

        if ($this->getSessionStartReasons()) {
            $data['shop_session_start_reasons'] = $this->getSessionStartReasons();
        }

        if ($this->getServerSideUserIP()) {
            $data['server_side_user_ip'] = $this->getServerSideUserIP();
        }

        if ($this->getValue() !== null) {
            $data['value'] = $this->getValue();
        }

        if ($this->getTransactionId()) {
            $data['transaction_id'] = $this->getTransactionId();
        }

        if ($this->getIncludingVat() !== null) {
            $data['including_vat'] = $this->getIncludingVat() ? 'true' : 'false';
        }

        return $data;
    }
}
