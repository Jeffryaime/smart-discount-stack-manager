/**
 * Enhanced BOGO Calculator with Auto-Cheapest Mode Support
 * Handles both specific SKU mode and auto-cheapest mode
 */

class BOGOCalculator {
  /**
   * Calculate BOGO discount with support for both modes
   * @param {Object} cart - Cart data with items array
   * @param {Object} bogoConfig - BOGO configuration
   * @param {Object} testData - Test data for price calculation
   * @returns {Object} Calculation result
   */
  static calculateBOGODiscount(cart, bogoConfig, testData) {
    const {
      buyQuantity = 1,
      getQuantity = 1,
      eligibleProductIds = [],
      freeProductIds = [],
      limitPerOrder = null,
      freeProductMode = 'specific'
    } = bogoConfig;

    // Validate input data to prevent division by zero and invalid calculations
    if (testData && testData.quantity <= 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: freeProductMode,
          error: 'Invalid quantity: must be greater than 0'
        }
      };
    }

    // If no cart items provided, create from test data
    const cartItems = cart?.items || [{
      productId: 'test-product',
      quantity: testData.quantity,
      price: testData.quantity > 0 ? testData.originalPrice / testData.quantity : 0
    }];

    // Filter eligible items from cart and validate quantities
    const eligibleItems = cartItems
      .filter(item => 
        eligibleProductIds.length === 0 || eligibleProductIds.includes(item.productId)
      )
      .filter(item => item.quantity > 0); // Ensure all items have positive quantities

    if (eligibleItems.length === 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: freeProductMode
        }
      };
    }

    // Calculate how many free items customer gets
    const totalEligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const setsQualified = Math.floor(totalEligibleQuantity / buyQuantity);
    let freeItemsCount = setsQualified * getQuantity;

    // Apply limit per order if set
    const limitApplied = limitPerOrder && freeItemsCount > limitPerOrder;
    if (limitApplied) {
      freeItemsCount = limitPerOrder;
    }

    if (freeItemsCount === 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: eligibleItems.length,
          totalEligibleQuantity,
          setsQualified,
          freeItemsCount: 0,
          mode: freeProductMode
        }
      };
    }

    let discount = 0;
    const freeItems = [];

    if (freeProductMode === 'cheapest') {
      // Auto-discount cheapest eligible items
      const result = this.calculateCheapestMode(eligibleItems, freeItemsCount);
      discount = result.discount;
      freeItems.push(...result.freeItems);
    } else {
      // Specific mode - use freeProductIds or eligible products
      const result = this.calculateSpecificMode(cartItems, eligibleProductIds, freeProductIds, freeItemsCount);
      discount = result.discount;
      freeItems.push(...result.freeItems);
    }

    return {
      discount,
      freeItems,
      appliedAmount: discount,
      calculationDetails: {
        eligibleItems: eligibleItems.length,
        totalEligibleQuantity,
        setsQualified,
        freeItemsCount,
        limitApplied,
        mode: freeProductMode,
        buyQuantity,
        getQuantity
      }
    };
  }

  /**
   * Calculate discount for cheapest mode
   */
  static calculateCheapestMode(eligibleItems, freeItemsCount) {
    // Sort by price (cheapest first), then by same SKU preference
    const sortedItems = [...eligibleItems].sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price; // Cheapest first
      }
      // When prices are equal, maintain stable sort (no specific SKU preference implemented)
      return 0;
    });

    let discount = 0;
    const freeItems = [];
    let remainingFree = freeItemsCount;

    for (const item of sortedItems) {
      if (remainingFree <= 0) break;

      const freeFromThisItem = Math.min(item.quantity, remainingFree);
      discount += item.price * freeFromThisItem;
      
      freeItems.push({
        productId: item.productId,
        quantity: freeFromThisItem,
        price: item.price,
        totalValue: item.price * freeFromThisItem
      });
      
      remainingFree -= freeFromThisItem;
    }

    return { discount, freeItems };
  }

  /**
   * Calculate discount for specific mode
   */
  static calculateSpecificMode(cartItems, eligibleProductIds, freeProductIds, freeItemsCount) {
    // Use freeProductIds if specified, otherwise fall back to eligibleProductIds
    const freeProductPool = freeProductIds.length > 0 ? freeProductIds : eligibleProductIds;
    const freeEligibleItems = cartItems.filter(item => 
      freeProductPool.includes(item.productId)
    );

    let discount = 0;
    const freeItems = [];

    if (freeEligibleItems.length > 0) {
      let remainingFree = freeItemsCount;

      // Prefer same SKU matching first (if customer bought X, give X free)
      for (const item of freeEligibleItems) {
        if (remainingFree <= 0) break;

        const freeFromThisItem = Math.min(item.quantity, remainingFree);
        discount += item.price * freeFromThisItem;
        
        freeItems.push({
          productId: item.productId,
          quantity: freeFromThisItem,
          price: item.price,
          totalValue: item.price * freeFromThisItem
        });
        
        remainingFree -= freeFromThisItem;
      }
    }

    return { discount, freeItems };
  }

  /**
   * Legacy BOGO calculation for backward compatibility
   * 
   * Note: This method calculates discounts based on complete BOGO sets (buy X + get Y),
   * whereas the new calculateBOGODiscount method uses eligible quantity approach
   * (buy X items to earn Y free items). This can result in different calculations
   * for the same input data.
   */
  static calculateLegacyBOGO(testData, buyQuantity, getQuantity, limitPerOrder = null) {
    // Validate input data to prevent division by zero
    if (!testData || testData.quantity <= 0) {
      return {
        appliedAmount: 0,
        freeItems: 0,
        bogoDetails: {
          buyQuantity,
          getQuantity,
          completeBuySets: 0,
          totalFreeItemsBeforeLimit: 0,
          limitApplied: false,
          error: 'Invalid quantity: must be greater than 0'
        }
      };
    }

    const completeBogoSets = Math.floor(testData.quantity / (buyQuantity + getQuantity));
    let totalFreeItems = completeBogoSets * getQuantity;

    // Apply per-order limit if specified
    const limitApplied = limitPerOrder && totalFreeItems > limitPerOrder;
    if (limitApplied) {
      totalFreeItems = limitPerOrder;
    }

    if (totalFreeItems > 0) {
      const pricePerItem = testData.originalPrice / testData.quantity;
      const discountAmount = totalFreeItems * pricePerItem;
      
      return {
        appliedAmount: discountAmount,
        freeItems: totalFreeItems,
        bogoDetails: {
          buyQuantity,
          getQuantity,
          completeBuySets: completeBogoSets,
          totalFreeItemsBeforeLimit: completeBogoSets * getQuantity,
          limitApplied
        }
      };
    }

    return {
      appliedAmount: 0,
      freeItems: 0,
      bogoDetails: {
        buyQuantity,
        getQuantity,
        completeBuySets: 0,
        totalFreeItemsBeforeLimit: 0,
        limitApplied: false
      }
    };
  }
}

module.exports = BOGOCalculator;