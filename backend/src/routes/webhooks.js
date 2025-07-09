const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhook } = require('../middleware/webhook');

// App uninstall webhook
router.post('/app/uninstalled', verifyWebhook, webhookController.handleAppUninstall);

// Order creation webhook
router.post('/orders/created', verifyWebhook, webhookController.handleOrderCreated);

// Order update webhook
router.post('/orders/updated', verifyWebhook, webhookController.handleOrderUpdated);

module.exports = router;