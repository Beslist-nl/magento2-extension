<?php

namespace Beslist\BeslistTracking\Controller;

use Beslist\BeslistTracking\src\EventHandler;
use InvalidArgumentException;
use Magento\Framework\App\ActionInterface;
use Magento\Framework\App\CsrfAwareActionInterface;
use Magento\Framework\App\Request\Http;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\App\Request\InvalidRequestException;
use Magento\Framework\Controller\Result\Json;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Data\Form\FormKey;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\Serializer\Json as JsonSerializer;
use Psr\Log\LoggerInterface;

abstract class ApiController implements ActionInterface, CsrfAwareActionInterface
{
    /** @var Http */
    protected Http $request;
    /** @var JsonFactory */
    protected JsonFactory $jsonFactory;
    /** @var FormKey */
    protected FormKey $formKey;
    /** @var EventHandler */
    protected EventHandler $eventHandler;
    /** @var JsonSerializer */
    private JsonSerializer $jsonSerializer;
    /** @var LoggerInterface */
    private LoggerInterface $logger;

    /**
     * ApiController constructor.
     *
     * @param Http $request
     * @param JsonFactory $jsonFactory
     * @param FormKey $formKey
     * @param EventHandler $eventHandler
     * @param JsonSerializer $jsonSerializer
     * @param LoggerInterface $logger
     */
    public function __construct(
        Http         $request,
        JsonFactory  $jsonFactory,
        FormKey      $formKey,
        EventHandler $eventHandler,
        JsonSerializer $jsonSerializer,
        LoggerInterface $logger
    ) {
        $this->request = $request;
        $this->jsonFactory = $jsonFactory;
        $this->formKey = $formKey;
        $this->eventHandler = $eventHandler;
        $this->jsonSerializer = $jsonSerializer;
        $this->logger = $logger;
    }

    /**
     * Execute the controller action.
     *
     * @return Json
     * @throws LocalizedException
     */
    public function execute(): Json
    {
        if (!$this->request->isPost()) {
            return $this->getErrorRestResponse('Only POST requests allowed.');
        }

        if (!$this->isTokenValid()) {
            return $this->getErrorRestResponse('Invalid token.');
        }

        return $this->handleRequest();
    }

    /**
     * Abstract method to be implemented by subclasses for specific request handling.
     *
     * @return Json
     */
    abstract public function handleRequest(): Json;

    /**
     * Validate the custom token sent in the request header.
     *
     * Compares the 'X-Beslist-Token' header against the current form key.
     *
     * @return bool
     * @throws LocalizedException
     */
    protected function isTokenValid(): bool
    {
        $headerToken = $this->request->getHeader('X-Beslist-Token');
        $formKey = $this->formKey->getFormKey();

        if ($headerToken !== $formKey) {
            return false;
        }

        return true;
    }

    /**
     * Create a CSRF validation exception.
     *
     * Returning null disables CSRF validation errors.
     *
     * @param RequestInterface $request
     * @return InvalidRequestException|null
     */
    public function createCsrfValidationException(RequestInterface $request): ?InvalidRequestException
    {
        return null;
    }

    /**
     * Validate request for CSRF.
     *
     * Returning true disables CSRF validation (accept all requests).
     *
     * @param RequestInterface $request
     * @return bool|null
     */
    public function validateForCsrf(RequestInterface $request): ?bool
    {
        return true;
    }

    /**
     * Parse the JSON body of the incoming request.
     *
     * @return array|null
     */
    protected function parseRequestData(): ?array
    {
        $requestBody = $this->request->getContent();
        if (!$requestBody) {
            return null;
        }

        try {
            return $this->jsonSerializer->unserialize($requestBody);
        } catch (InvalidArgumentException $e) {
            $this->logger->error('Failed to parse JSON request body', [
                'exception' => $e,
                'body' => $requestBody
            ]);
            return null;
        }
    }

    /**
     * Create a JSON response for a successful request.
     *
     * @param string $message
     * @param array|null $data
     * @return Json
     */
    protected function getSuccessRestResponse(string $message = 'Success', ?array $data = null): Json
    {
        $responseData = [
            'status' => 'success',
            'message' => $message,
        ];

        if ($data) {
            $responseData['data'] = $data;
        }

        return $this->jsonFactory->create()->setData($responseData)->setHttpResponseCode(200);
    }

    /**
     * Create a JSON response for an error.
     *
     * @param string $message
     * @param array|null $data
     * @param int $statusCode
     * @return Json
     */
    protected function getErrorRestResponse(string $message = 'Error', ?array $data = null, int $statusCode = 400): Json
    {
        $responseData = [
            'status' => 'error',
            'message' => $message,
        ];

        if ($data) {
            $responseData['data'] = $data;
        }

        return $this->jsonFactory->create()->setData($responseData)->setHttpResponseCode($statusCode);
    }
}
