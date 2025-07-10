import React, { useState } from 'react';
import {
  Modal,
  Card,
  TextField,
  Button,
  Badge,
  Box,
  Text,
  DescriptionList,
  Divider,
  InlineError,
  SkeletonBodyText,
  Banner,
  VerticalStack,
  HorizontalStack
} from '@shopify/polaris';

const TestDiscountModal = ({ open, onClose, discountStack, onTest }) => {
  const [testData, setTestData] = useState({
    cartTotal: '',
    itemQuantity: '',
    productIds: '',
    collectionIds: '',
    customerSegment: '',
    shippingCost: '',
    taxRate: ''
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field) => (value) => {
    setTestData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    
    if (!testData.cartTotal || parseFloat(testData.cartTotal) <= 0) {
      newErrors.cartTotal = 'Cart total must be greater than 0';
    }
    
    if (testData.itemQuantity && parseInt(testData.itemQuantity) < 0) {
      newErrors.itemQuantity = 'Quantity cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const testPayload = {
        originalPrice: parseFloat(testData.cartTotal),
        quantity: testData.itemQuantity ? parseInt(testData.itemQuantity) : 1,
        productIds: testData.productIds ? testData.productIds.split(',').map(id => id.trim()).filter(Boolean) : [],
        collectionIds: testData.collectionIds ? testData.collectionIds.split(',').map(id => id.trim()).filter(Boolean) : [],
        customerSegment: testData.customerSegment,
        shippingCost: testData.shippingCost ? parseFloat(testData.shippingCost) : 0,
        taxRate: testData.taxRate ? parseFloat(testData.taxRate) / 100 : 0
      };
      
      const result = await onTest(testPayload);
      setResults(result);
    } catch (error) {
      console.error('Test failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to run test. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTestData({
      cartTotal: '',
      itemQuantity: '',
      productIds: '',
      collectionIds: '',
      customerSegment: '',
      shippingCost: '',
      taxRate: ''
    });
    setResults(null);
    setErrors({});
    onClose();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Test Discount Stack: ${discountStack?.name || ''}`}
      primaryAction={{
        content: 'Run Test',
        onAction: handleTest,
        loading: loading,
        disabled: loading
      }}
      secondaryActions={[
        {
          content: 'Close',
          onAction: handleClose
        }
      ]}
    >
      <Modal.Section>
        <VerticalStack gap="5">
          {errors.general && (
            <Banner status="critical" onDismiss={() => setErrors({ ...errors, general: null })}>
              {errors.general}
            </Banner>
          )}
          
          <Card sectioned>
            <VerticalStack gap="4">
              <Text variant="headingMd" as="h3">Cart Simulation</Text>
              
              <TextField
                label="Cart Total"
                type="number"
                value={testData.cartTotal}
                onChange={handleInputChange('cartTotal')}
                prefix="$"
                placeholder="100.00"
                error={errors.cartTotal}
                helpText="Enter the total cart value to test"
                autoComplete="off"
              />
              
              <TextField
                label="Item Quantity"
                type="number"
                value={testData.itemQuantity}
                onChange={handleInputChange('itemQuantity')}
                placeholder="1"
                error={errors.itemQuantity}
                helpText="Number of items in the cart (optional)"
                autoComplete="off"
              />
              
              <TextField
                label="Product IDs"
                value={testData.productIds}
                onChange={handleInputChange('productIds')}
                placeholder="product-1, product-2"
                helpText="Comma-separated product IDs (optional)"
                autoComplete="off"
              />
              
              <TextField
                label="Collection IDs"
                value={testData.collectionIds}
                onChange={handleInputChange('collectionIds')}
                placeholder="collection-1, collection-2"
                helpText="Comma-separated collection IDs (optional)"
                autoComplete="off"
              />
              
              <TextField
                label="Customer Segment"
                value={testData.customerSegment}
                onChange={handleInputChange('customerSegment')}
                placeholder="VIP"
                helpText="Customer segment for testing (optional)"
                autoComplete="off"
              />
              
              <TextField
                label="Shipping Cost"
                type="number"
                value={testData.shippingCost}
                onChange={handleInputChange('shippingCost')}
                prefix="$"
                placeholder="10.00"
                helpText="Shipping cost to add to the order (optional)"
                autoComplete="off"
              />
              
              <TextField
                label="Tax Rate"
                type="number"
                value={testData.taxRate}
                onChange={handleInputChange('taxRate')}
                suffix="%"
                placeholder="8.25"
                helpText="Tax percentage (e.g., 8.25 for 8.25%)"
                autoComplete="off"
              />
            </VerticalStack>
          </Card>
          
          {loading && (
            <Card sectioned>
              <SkeletonBodyText lines={4} />
            </Card>
          )}
          
          {results && !loading && (
            <Card sectioned>
              <VerticalStack gap="4">
                <Text variant="headingMd" as="h3">Test Results</Text>
                
                <Box paddingBlockStart="200">
                  <VerticalStack gap="2">
                    <Text variant="headingMd" as="h4">Order Summary</Text>
                    
                    <HorizontalStack align="space-between">
                      <Text>Items:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {formatCurrency(results.originalPrice)}
                      </Text>
                    </HorizontalStack>
                    
                    {results.productDiscountAmount > 0 && (
                      <HorizontalStack align="space-between">
                        <Text tone="success">Product Discounts:</Text>
                        <Text variant="bodyMd" fontWeight="semibold" tone="success">
                          -{formatCurrency(results.productDiscountAmount)}
                        </Text>
                      </HorizontalStack>
                    )}
                    
                    <HorizontalStack align="space-between">
                      <Text>Shipping:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {results.freeShippingApplied ? (
                          <>
                            <span style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                              {formatCurrency(results.originalShippingCost)}
                            </span>
                            <Text tone="success" as="span">FREE</Text>
                          </>
                        ) : (
                          formatCurrency(results.shippingCost)
                        )}
                      </Text>
                    </HorizontalStack>
                    
                    <HorizontalStack align="space-between">
                      <Text>Subtotal:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {formatCurrency(results.subtotal)}
                      </Text>
                    </HorizontalStack>
                    
                    {results.taxAmount > 0 && (
                      <HorizontalStack align="space-between">
                        <Text>Tax ({(results.taxRate * 100).toFixed(2)}%):</Text>
                        <Text variant="bodyMd" fontWeight="semibold">
                          {formatCurrency(results.taxAmount)}
                        </Text>
                      </HorizontalStack>
                    )}
                    
                    <Divider />
                    
                    <HorizontalStack align="space-between">
                      <Text variant="headingMd">Total:</Text>
                      <Text variant="headingLg" fontWeight="bold">
                        {formatCurrency(results.finalTotal)}
                      </Text>
                    </HorizontalStack>
                    
                    {results.totalDiscountAmount > 0 && (
                      <HorizontalStack align="space-between">
                        <Text variant="bodyMd" tone="success">You saved:</Text>
                        <Text variant="bodyMd" fontWeight="semibold" tone="success">
                          {formatCurrency(results.totalDiscountAmount)} ({results.savingsPercentage}%)
                        </Text>
                      </HorizontalStack>
                    )}
                  </VerticalStack>
                </Box>
                
                {results.appliedDiscounts && results.appliedDiscounts.length > 0 && (
                  <>
                    <Divider />
                    <VerticalStack gap="3">
                      <HorizontalStack align="space-between" blockAlign="center">
                        <Text variant="headingMd" as="h4">Applied Discounts</Text>
                        {results.savingsPercentage > 0 && (
                          <Badge status="success">{results.savingsPercentage}% Total Savings</Badge>
                        )}
                      </HorizontalStack>
                      {results.appliedDiscounts.map((discount, index) => (
                        <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="200">
                          <VerticalStack gap="2">
                            <HorizontalStack align="space-between" blockAlign="center">
                              <HorizontalStack gap="2" blockAlign="center">
                                <Badge status={discount.isActive ? 'success' : 'neutral'}>
                                  {discount.type.replace('_', ' ')}
                                </Badge>
                                <Text variant="bodyMd" fontWeight="semibold">
                                  {discount.type === 'percentage' 
                                    ? `${discount.value}% off`
                                    : discount.type === 'fixed_amount'
                                    ? `$${discount.value} off`
                                    : discount.type === 'free_shipping'
                                    ? 'Free Shipping'
                                    : discount.type === 'buy_x_get_y'
                                    ? (() => {
                                        const buyQty = discount.bogoDetails?.buyQuantity || discount.value || 1;
                                        const getQty = discount.bogoDetails?.getQuantity || 1;
                                        const freeItems = discount.freeItems || 0;
                                        return `Buy ${buyQty} Get ${getQty} Free${freeItems > 0 ? ` (${freeItems} free items)` : ''}`;
                                      })()
                                    : `${discount.value} discount`
                                  }
                                </Text>
                              </HorizontalStack>
                              {discount.appliedAmount > 0 && (
                                <Text variant="bodyMd" fontWeight="semibold" tone="success">
                                  -{formatCurrency(discount.appliedAmount)}
                                </Text>
                              )}
                              {discount.freeShipping && (
                                <Badge status="success" size="small">Applied</Badge>
                              )}
                            </HorizontalStack>
                            {discount.conditions && (
                              <Text variant="bodySm" color="subdued">
                                {discount.conditions.minimumAmount && `Min: ${formatCurrency(discount.conditions.minimumAmount)}`}
                                {discount.conditions.minimumQuantity && ` • Min Qty: ${discount.conditions.minimumQuantity}`}
                                {discount.priority !== undefined && ` • Priority: ${discount.priority}`}
                              </Text>
                            )}
                            {discount.type === 'buy_x_get_y' && discount.bogoDetails && (
                              <Text variant="bodySm" color="subdued">
                                Buy {discount.bogoDetails.buyQuantity} Get {discount.bogoDetails.getQuantity} • 
                                Complete Sets: {discount.bogoDetails.completeSets} • 
                                Extra Free: {discount.bogoDetails.extraFreeItems}
                                {discount.bogoDetails.limitApplied && ' • Limit Applied'}
                              </Text>
                            )}
                          </VerticalStack>
                        </Box>
                      ))}
                    </VerticalStack>
                  </>
                )}
                
                {results.appliedDiscounts && results.appliedDiscounts.length === 0 && (
                  <Banner status="info">
                    No discounts were applied. Check that the cart meets all discount conditions.
                  </Banner>
                )}
              </VerticalStack>
            </Card>
          )}
        </VerticalStack>
      </Modal.Section>
    </Modal>
  );
};

export default TestDiscountModal;