require('@shopify/shopify-api/adapters/node'); // <-- Add this line

const { shopifyApi } = require('@shopify/shopify-api');
const { ApiVersion } = require('@shopify/shopify-api');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_discounts',
    'write_discounts',
  ],
  hostName: process.env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, '') || 'acd5391e809f.ngrok-free.app',
  apiVersion: ApiVersion.July23,
  isEmbeddedApp: true,
});

module.exports = { shopify };
