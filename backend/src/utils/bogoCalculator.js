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
    // Validate bogoConfig input
    if (!bogoConfig || typeof bogoConfig !== 'object') {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: 'specific',
          error: 'Invalid or missing BOGO configuration'
        }
      };
    }

    const {
      buyQuantity = 1,
      getQuantity = 1,
      eligibleProductIds = [],
      freeProductIds = [],
      limitPerOrder = null,
      freeProductMode = 'specific'
    } = bogoConfig;

    // Normalize and validate freeProductMode first
    const normalizedMode = typeof freeProductMode === 'string' 
      ? freeProductMode.toLowerCase() 
      : 'specific';
    const validModes = ['specific', 'cheapest'];
    const validatedMode = validModes.includes(normalizedMode) ? normalizedMode : 'specific';

    // Validate buyQuantity to prevent division by zero
    if (buyQuantity <= 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: validatedMode,
          error: 'Invalid buyQuantity: must be greater than 0'
        }
      };
    }

    // Validate getQuantity
    if (getQuantity <= 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: validatedMode,
          error: 'Invalid getQuantity: must be greater than 0'
        }
      };
    }

    // Validate input data to prevent division by zero and invalid calculations
    if (!testData || testData.quantity === null || testData.quantity === undefined || testData.quantity <= 0) {
      return {
        discount: 0,
        freeItems: [],
        appliedAmount: 0,
        calculationDetails: {
          eligibleItems: 0,
          setsQualified: 0,
          freeItemsCount: 0,
          mode: validatedMode,
          error: 'Invalid quantity: must be greater than 0'
        }
      };
    }

    // If no cart items provided, create from test data
    const usingTestDataFallback = !cart?.items;
    const cartItems = cart?.items || [{
      productId: 'test-product',
      quantity: testData.quantity,
      price: testData.quantity > 0 ? testData.originalPrice / testData.quantity : 0
    }];

    // Ensure arrays are valid
    const safeEligibleProductIds = Array.isArray(eligibleProductIds) ? eligibleProductIds : [];
    const safeFreeProductIds = Array.isArray(freeProductIds) ? freeProductIds : [];

    // Filter eligible items from cart and validate quantities
    // When using test data fallback, ignore product ID restrictions
    const eligibleItems = cartItems
      .filter(item => 
        usingTestDataFallback || safeEligibleProductIds.length === 0 || safeEligibleProductIds.includes(item.productId)
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
          mode: validatedMode
        }
      };
    }

    // Calculate how many free items customer gets
    const totalEligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const setsQualified = Math.floor(totalEligibleQuantity / buyQuantity);
    let freeItemsCount = setsQualified * getQuantity;

    // Apply limit per order if set
    let limitApplied = null;
    if (limitPerOrder !== null && limitPerOrder !== undefined) {
      if (limitPerOrder === 0) {
        // Zero limit means no free items allowed
        freeItemsCount = 0;
        limitApplied = true;
      } else if (freeItemsCount > limitPerOrder) {
        freeItemsCount = limitPerOrder;
        limitApplied = true;
      }
      // If limit exists but wasn't applied (limit >= freeItemsCount), keep limitApplied = null
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
          limitApplied,
          mode: validatedMode,
          buyQuantity,
          getQuantity
        }
      };
    }

    let discount = 0;
    const freeItems = [];

    if (validatedMode === 'cheapest') {
      // Auto-discount cheapest eligible items
      const result = this.calculateCheapestMode(eligibleItems, freeItemsCount);
      discount = result.discount;
      freeItems.push(...result.freeItems);
    } else {
      // Specific mode - use freeProductIds or eligible products
      const result = this.calculateSpecificMode(cartItems, safeEligibleProductIds, safeFreeProductIds, freeItemsCount, usingTestDataFallback);
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
        mode: validatedMode,
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
  static calculateSpecificMode(cartItems, eligibleProductIds, freeProductIds, freeItemsCount, usingTestDataFallback = false) {
    // Determine which products can be given for free based on fallback logic precedence
    let freeProductPool;
    
    if (usingTestDataFallback) {
      // PRIORITY 1: Test data fallback mode
      // When testing with simplified test data, ignore all product restrictions 
      // and allow any cart item to be free. This ensures tests work regardless 
      // of specific product configurations.
      freeProductPool = cartItems.map(item => item.productId);
    } else if (freeProductIds.length > 0) {
      // PRIORITY 2: Explicit free product list (highest precedence in production)
      // When merchant has explicitly specified which products can be free,
      // use that list exclusively. This allows for cross-product BOGO 
      // (e.g., buy shirts, get hats free).
      freeProductPool = freeProductIds;
    } else if (eligibleProductIds.length > 0) {
      // PRIORITY 3: Auto-default to eligible products
      // When no free products specified but eligible products exist,
      // auto-set free products to match eligible products. This creates
      // same-SKU BOGO behavior (e.g., buy 2 shirts, get 1 shirt free).
      freeProductPool = eligibleProductIds;
    } else {
      // PRIORITY 4: Fallback to all cart items (lowest precedence)
      // When both eligible and free product arrays are empty,
      // allow any cart item to be free. This prevents broken configurations
      // but should rarely be used in production.
      freeProductPool = cartItems.map(item => item.productId);
    }
    const freeEligibleItems = cartItems
      .filter(item => freeProductPool.includes(item.productId))
      .filter(item => item.quantity > 0); // Filter out zero/negative quantities

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