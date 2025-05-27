<?php

namespace Beslist\BeslistTracking\Model\ResourceModel\EventQueue;

use Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection;
use Beslist\BeslistTracking\Model\EventQueue as Model;
use Beslist\BeslistTracking\Model\ResourceModel\EventQueue as ResourceModel;

class Collection extends AbstractCollection
{
    /**
     * Collection constructor.
     *
     * @return void
     */
    protected function _construct()
    {
        $this->_init(Model::class, ResourceModel::class);
    }
}
