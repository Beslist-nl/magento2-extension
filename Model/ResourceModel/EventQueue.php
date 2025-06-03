<?php

namespace Beslist\BeslistTracking\Model\ResourceModel;

use Beslist\BeslistTracking\src\BeslistTrackingConfiguration;
use Magento\Framework\Model\ResourceModel\Db\AbstractDb;

class EventQueue extends AbstractDb
{
    /**
     * EventQueue constructor.
     *
     * @return void
     */
    protected function _construct()
    {
        $this->_init(BeslistTrackingConfiguration::EVENT_QUEUE_TABLE_NAME, 'id');
    }
}
