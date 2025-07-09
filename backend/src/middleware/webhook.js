const crypto = require('crypto');

const verifyWebhook = (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body;
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Webhook verification failed' });
  }

  next();
};

module.exports = {
  verifyWebhook
};