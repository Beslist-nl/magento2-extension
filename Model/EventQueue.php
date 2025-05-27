<?php

namespace Beslist\BeslistTracking\Model;

use Magento\Framework\Model\AbstractModel;

class EventQueue extends AbstractModel
{
    /**
     * EventQueue constructor.
     *
     * @return void
     */
    protected function _construct()
    {
        $this->_init(ResourceModel\EventQueue::class);
    }
}
