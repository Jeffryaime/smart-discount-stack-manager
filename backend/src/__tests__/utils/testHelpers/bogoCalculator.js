/**
 * Shared BOGO test utilities
 * This module provides common test helper functions to avoid code duplication
 * across multiple test files.
 */

/**
 * Test implementation of BOGO discount calculation
 * 
 * IMPORTANT: This is a simplified version for testing purposes and may differ from
 * the production BOGOCalculator in some edge cases. For production code, use
 * the BOGOCalculator class from '../utils/bogoCalculator.js'.
 * 
 * This test helper was extracted to eliminate code duplication between test files.
 * 
 * @param {Object} cart - Cart data with items array
 * @param {Object} bogoConfig - BOGO configuration
 * @returns {Object} Calculation result with discount and freeItems
 */
const calculateBOGODiscount = (cart, bogoConfig) => {
  const {
    buyQuantity,
    getQuantity,
    eligibleProductIds,
    freeProductIds,
    limitPerOrder,
    freeProductMode,
  } = bogoConfig;

  // Filter eligible items from cart
  const eligibleItems = cart.items.filter(
    (item) =>
      eligibleProductIds.length === 0 ||
      eligibleProductIds.includes(item.productId)
  );

  if (eligibleItems.length === 0) return { discount: 0, freeItems: [] };

  // Sort by price for cheapest mode
  const sortedItems = [...eligibleItems].sort((a, b) => a.price - b.price);

  // Calculate how many free items customer gets
  const totalEligibleQuantity = eligibleItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const setsQualified = Math.floor(totalEligibleQuantity / buyQuantity);
  let freeItemsCount = setsQualified * getQuantity;

  // Apply limit per order if set
  if (limitPerOrder !== null && limitPerOrder !== undefined) {
    freeItemsCount = Math.min(freeItemsCount, limitPerOrder);
  }

  let discount = 0;
  const freeItems = [];

  if (freeProductMode === 'cheapest') {
    // Auto-discount cheapest eligible items
    let remainingFree = freeItemsCount;

    for (const item of sortedItems) {
      if (remainingFree <= 0) break;

      const freeFromThisItem = Math.min(item.quantity, remainingFree);
      discount += item.price * freeFromThisItem;
      freeItems.push({
        productId: item.productId,
        quantity: freeFromThisItem,
        price: item.price,
      });
      remainingFree -= freeFromThisItem;
    }
  } else {
    // Specific mode - use freeProductIds or eligible products
    const freeProductPool =
      freeProductIds.length > 0 ? freeProductIds : eligibleProductIds;
    const freeEligibleItems = cart.items.filter((item) =>
      freeProductPool.includes(item.productId)
    );

    if (freeEligibleItems.length > 0) {
      let remainingFree = freeItemsCount;

      // Prefer same SKU matching first
      for (const item of freeEligibleItems) {
        if (remainingFree <= 0) break;

        const freeFromThisItem = Math.min(item.quantity, remainingFree);
        discount += item.price * freeFromThisItem;
        freeItems.push({
          productId: item.productId,
          quantity: freeFromThisItem,
          price: item.price,
        });
        remainingFree -= freeFromThisItem;
      }
    }
  }

  return { discount, freeItems };
};

module.exports = {
  calculateBOGODiscount,
};