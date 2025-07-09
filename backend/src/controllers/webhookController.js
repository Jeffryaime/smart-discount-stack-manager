const webhookController = {
  async handleAppUninstall(req, res) {
    try {
      const { shop } = req.body;
      console.log(`App uninstalled for shop: ${shop}`);
      
      // Clean up data for uninstalled shop
      // await DiscountStack.deleteMany({ shop });
      
      res.status(200).json({ message: 'App uninstall processed' });
    } catch (error) {
      console.error('Error handling app uninstall:', error);
      res.status(500).json({ error: 'Failed to process app uninstall' });
    }
  },

  async handleOrderCreated(req, res) {
    try {
      const order = req.body;
      console.log(`Order created: ${order.id}`);
      
      // Process order for discount analytics
      // await processOrderForAnalytics(order);
      
      res.status(200).json({ message: 'Order created processed' });
    } catch (error) {
      console.error('Error handling order created:', error);
      res.status(500).json({ error: 'Failed to process order created' });
    }
  },

  async handleOrderUpdated(req, res) {
    try {
      const order = req.body;
      console.log(`Order updated: ${order.id}`);
      
      // Process order update for analytics
      // await updateOrderAnalytics(order);
      
      res.status(200).json({ message: 'Order updated processed' });
    } catch (error) {
      console.error('Error handling order updated:', error);
      res.status(500).json({ error: 'Failed to process order updated' });
    }
  }
};

module.exports = webhookController;