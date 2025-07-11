import React from 'react';
import {
  VerticalStack,
  HorizontalStack,
  Text,
  Button,
  Card,
  Select,
  TextField,
  FormLayout,
  Checkbox,
  Banner,
  RadioButton,
} from '@shopify/polaris';
import UnifiedProductSelector from './UnifiedProductSelector';

function DiscountRuleForm({ discounts = [], onChange, error }) {
  const discountTypes = [
    { label: 'Percentage Off', value: 'percentage' },
    { label: 'Fixed Amount Off', value: 'fixed_amount' },
    { label: 'Buy X Get Y Free', value: 'buy_x_get_y' },
    { label: 'Free Shipping', value: 'free_shipping' },
  ];

  const addDiscount = () => {
    const newDiscount = {
      id: Date.now().toString(),
      type: 'percentage',
      value: 0,
      bogoConfig: {
        buyQuantity: 1,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: 1, // Auto-set to match getQuantity by default
        freeProductMode: 'specific' // 'specific' or 'cheapest'
      },
      conditions: {
        minimumAmount: null,
        minimumQuantity: null,
        productIds: [],
        collectionIds: [],
      },
      priority: discounts.length,
      isActive: true,
    };
    
    onChange([...discounts, newDiscount]);
  };

  const validateDiscountValue = (type, value) => {
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return 'Percentage must be between 1 and 100';
    }
    if ((type === 'fixed_amount' || type === 'buy_x_get_y') && value <= 0) {
      return 'Amount must be greater than 0';
    }
    if (type === 'free_shipping' && value !== 0) {
      return 'Free shipping value should be 0';
    }
    return null;
  };

  const validateAndParseProductIds = (inputValue) => {
    if (!inputValue || inputValue.trim() === '') {
      return [];
    }
    
    // Split by comma, trim whitespace, and filter out empty strings
    const rawIds = inputValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    // Validate each ID format (Shopify product IDs are typically numeric or gid://shopify/Product/123)
    const productIdRegex = /^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/;
    
    const validIds = rawIds.filter(id => {
      if (!productIdRegex.test(id)) {
        console.warn(`Invalid product ID format: "${id}". Expected numeric ID or Shopify GID format.`);
        return false;
      }
      return true;
    });
    
    return validIds;
  };

  const updateDiscount = (index, field, value) => {
    const updatedDiscounts = [...discounts];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      // Convert to number for numeric fields
      if ((child === 'minimumAmount' || child === 'minimumQuantity') && value !== '') {
        updatedDiscounts[index][parent][child] = Number(value);
      } else if (parent === 'bogoConfig' && (child === 'buyQuantity' || child === 'getQuantity') && value !== '') {
        updatedDiscounts[index][parent][child] = Number(value);
      } else if (parent === 'bogoConfig' && child === 'limitPerOrder') {
        // Handle limitPerOrder specially - ensure minimum value of 1 (no unlimited/0 option)
        const numValue = Number(value) || 1;
        updatedDiscounts[index][parent][child] = Math.max(1, numValue);
      } else {
        updatedDiscounts[index][parent][child] = value;
      }
    } else {
      updatedDiscounts[index][field] = value;
    }
    
    // Auto-set value to 0 for free shipping
    if (field === 'type' && value === 'free_shipping') {
      updatedDiscounts[index].value = 0;
    }
    
    // For BOGO, sync value with buyQuantity in bogoConfig
    if (field === 'value' && updatedDiscounts[index].type === 'buy_x_get_y') {
      updatedDiscounts[index].bogoConfig.buyQuantity = Number(value) || 1;
    }
    if (field === 'bogoConfig.buyQuantity') {
      updatedDiscounts[index].value = Number(value) || 1;
    }
    
    // Validate discount value
    if (field === 'value' || field === 'type') {
      const discount = updatedDiscounts[index];
      const error = validateDiscountValue(discount.type, discount.value);
      updatedDiscounts[index].error = error;
    }
    
    onChange(updatedDiscounts);
  };

  const removeDiscount = (index) => {
    const updatedDiscounts = discounts.filter((_, i) => i !== index);
    onChange(updatedDiscounts);
  };

  return (
    <VerticalStack gap="6">
      <HorizontalStack align="space-between" blockAlign="center">
        <VerticalStack gap="2">
          <Text variant="headingMd">Discount Rules</Text>
          <Text variant="bodyMd" tone="subdued">
            Create multiple discount rules that will be applied in order of priority
          </Text>
        </VerticalStack>
        <Button onClick={addDiscount} variant="primary" size="large">
          Add Discount Rule
        </Button>
      </HorizontalStack>

      {error && (
        <Banner status="critical">
          {error}
        </Banner>
      )}

      {discounts.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#fafbfb', 
          border: '2px dashed #c9cccf', 
          borderRadius: '8px' 
        }}>
          <VerticalStack gap="4">
            <Text variant="headingMd" tone="subdued">No discount rules added yet</Text>
            <Text variant="bodyMd" tone="subdued">
              Add discount rules to create a discount stack
            </Text>
            <Button onClick={addDiscount} variant="primary">
              Add Your First Discount
            </Button>
          </VerticalStack>
        </div>
      ) : (
        discounts.map((discount, index) => (
          <Card key={discount.id}>
            <div style={{ 
              padding: '24px', 
              backgroundColor: index % 2 === 0 ? '#fafbfb' : '#ffffff',
              border: '2px solid #e1e3e5',
              borderRadius: '8px'
            }}>
              <VerticalStack gap="5">
                <HorizontalStack align="space-between" blockAlign="center">
                  <VerticalStack gap="1">
                    <Text variant="headingSm">Discount Rule #{index + 1}</Text>
                    <Text variant="bodySm" tone="subdued">
                      Priority: {discount.priority} (lower numbers apply first)
                    </Text>
                  </VerticalStack>
                  <Button
                    plain
                    destructive
                    onClick={() => removeDiscount(index)}
                    size="large"
                  >
                    Remove Rule
                  </Button>
                </HorizontalStack>

                <FormLayout>
                  <HorizontalStack gap="6">
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Discount Type"
                        options={discountTypes}
                        value={discount.type}
                        onChange={(value) => updateDiscount(index, 'type', value)}
                        helpText="Choose how this discount should be calculated"
                      />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      {discount.type === 'free_shipping' ? (
                        <div style={{ paddingTop: '24px' }}>
                          <Text variant="bodySm" tone="subdued">
                            Free shipping will be applied automatically - no value needed
                          </Text>
                        </div>
                      ) : discount.type === 'buy_x_get_y' ? (
                        <HorizontalStack gap="4">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Buy Quantity (X)"
                              type="number"
                              value={discount.bogoConfig?.buyQuantity || discount.value || 1}
                              onChange={(value) => updateDiscount(index, 'bogoConfig.buyQuantity', parseInt(value) || 1)}
                              helpText="How many items to buy"
                              min="1"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Get Quantity (Y)"
                              type="number"
                              value={discount.bogoConfig?.getQuantity || 1}
                              onChange={(value) => {
                                const newGetQuantity = parseInt(value) || 1;
                                const currentLimit = discount.bogoConfig?.limitPerOrder || 1;
                                const currentGetQuantity = discount.bogoConfig?.getQuantity || 1;
                                
                                // Calculate the proportional multiplier the user had set
                                const multiplier = Math.max(1, Math.round(currentLimit / currentGetQuantity));
                                
                                // Auto-update limit to maintain the same proportional relationship
                                const newLimit = newGetQuantity * multiplier;
                                
                                // Update both fields in sequence to ensure proper state update
                                const updatedDiscounts = [...discounts];
                                updatedDiscounts[index] = {
                                  ...updatedDiscounts[index],
                                  bogoConfig: {
                                    ...updatedDiscounts[index].bogoConfig,
                                    getQuantity: newGetQuantity,
                                    limitPerOrder: newLimit
                                  }
                                };
                                onChange(updatedDiscounts);
                              }}
                              helpText="How many items they get free"
                              min="1"
                            />
                          </div>
                        </HorizontalStack>
                      ) : (
                        <TextField
                          label={
                            discount.type === 'percentage' 
                              ? 'Percentage Off'
                              : 'Amount Off'
                          }
                          type="number"
                          value={discount.value}
                          onChange={(value) => updateDiscount(index, 'value', parseFloat(value) || 0)}
                          suffix={discount.type === 'percentage' ? '%' : '$'}
                          error={discount.error}
                          helpText={
                            discount.type === 'percentage' 
                              ? "Enter 1-100 (e.g., 20 for 20% off)"
                              : "Enter amount (e.g., 10 for $10 off)"
                          }
                        />
                      )}
                    </div>
                  </HorizontalStack>

                  <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                    <VerticalStack gap="4">
                      <Text variant="headingXs">Conditions (Optional)</Text>
                      <HorizontalStack gap="4">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Minimum Cart Amount"
                            type="number"
                            value={discount.conditions.minimumAmount || ''}
                            onChange={(value) => updateDiscount(index, 'conditions.minimumAmount', value)}
                            prefix="$"
                            helpText="Customer must spend at least this amount"
                          />
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Minimum Item Quantity"
                            type="number"
                            value={discount.conditions.minimumQuantity || ''}
                            onChange={(value) => updateDiscount(index, 'conditions.minimumQuantity', value)}
                            helpText="Customer must have at least this many items"
                          />
                        </div>
                      </HorizontalStack>
                      
                      {discount.type === 'buy_x_get_y' && (
                        <VerticalStack gap="4">
                          <Text variant="bodySm" tone="subdued">BOGO Specific Options</Text>
                          
                          {/* Free Product Mode Selection */}
                          <VerticalStack gap="3">
                            <Text variant="bodyMd">Free Product Selection Mode</Text>
                            <HorizontalStack gap="4">
                              <RadioButton
                                label="Use specific SKUs"
                                checked={discount.bogoConfig?.freeProductMode === 'specific' || !discount.bogoConfig?.freeProductMode}
                                id={`specific-${discount.id}`}
                                name={`free-product-mode-${discount.id}`}
                                onChange={() => updateDiscount(index, 'bogoConfig.freeProductMode', 'specific')}
                                helpText="Manually select which products customers get for free"
                              />
                              <RadioButton
                                label="Auto-discount cheapest eligible item"
                                checked={discount.bogoConfig?.freeProductMode === 'cheapest'}
                                id={`cheapest-${discount.id}`}
                                name={`free-product-mode-${discount.id}`}
                                onChange={() => updateDiscount(index, 'bogoConfig.freeProductMode', 'cheapest')}
                                helpText="Automatically discount the cheapest item from eligible products"
                              />
                            </HorizontalStack>
                          </VerticalStack>
                          
                          <HorizontalStack gap="4">
                            <div style={{ flex: 1 }}>
                              <UnifiedProductSelector
                                label="Eligible Products (Buy X)"
                                value={discount.bogoConfig?.eligibleProductIds || []}
                                onChange={(value) => updateDiscount(index, 'bogoConfig.eligibleProductIds', value)}
                                helpText="Products that qualify for the 'Buy X' part of the offer. Search by products, collections, or SKUs."
                                mode="products"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <UnifiedProductSelector
                                label="Free Products (Get Y)"
                                value={discount.bogoConfig?.freeProductIds || []}
                                onChange={(value) => updateDiscount(index, 'bogoConfig.freeProductIds', value)}
                                helpText={discount.bogoConfig?.freeProductMode === 'cheapest' 
                                  ? "This field is ignored when auto-discounting cheapest item" 
                                  : "Products that customers get for free. Leave empty to use the same products as 'Buy X'. Search by products, collections, or SKUs."}
                                mode="products"
                                disabled={discount.bogoConfig?.freeProductMode === 'cheapest'}
                              />
                            </div>
                          </HorizontalStack>
                          
                          {discount.bogoConfig?.freeProductMode === 'cheapest' && (
                            <Banner status="info">
                              <p>When using auto-discount mode, the system will:</p>
                              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                                <li>Select the cheapest product from Eligible Products only</li>
                                <li>If items have the same price, prefer matching items (same SKU)</li>
                                <li>Otherwise, select the lowest-priced unit</li>
                                <li>Respect the Limit Per Order setting if configured</li>
                              </ul>
                            </Banner>
                          )}
                          
                          <div style={{ width: '50%' }}>
                            <Select
                              label="Limit Per Order"
                              options={(() => {
                                const getQuantity = discount.bogoConfig?.getQuantity || 1;
                                const options = [];
                                
                                // Generate multiples: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x
                                for (let multiplier = 1; multiplier <= 10; multiplier++) {
                                  const value = getQuantity * multiplier;
                                  options.push({
                                    label: value.toString(),
                                    value: value.toString()
                                  });
                                }
                                
                                return options;
                              })()}
                              value={discount.bogoConfig?.limitPerOrder?.toString() || (discount.bogoConfig?.getQuantity || 1).toString()}
                              onChange={(value) => {
                                const numValue = parseInt(value) || 1;
                                updateDiscount(index, 'bogoConfig.limitPerOrder', numValue);
                              }}
                              helpText={(() => {
                                const getQuantity = discount.bogoConfig?.getQuantity || 1;
                                const limitPerOrder = discount.bogoConfig?.limitPerOrder || getQuantity;
                                const multiplier = Math.round(limitPerOrder / getQuantity);
                                
                                return `Selected: ${limitPerOrder} free items per order (${multiplier}x the Get Quantity of ${getQuantity})`;
                              })()}
                            />
                          </div>
                        </VerticalStack>
                      )}
                    </VerticalStack>
                  </div>

                  <HorizontalStack gap="4">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Priority"
                        type="number"
                        value={discount.priority}
                        onChange={(value) => updateDiscount(index, 'priority', parseInt(value) || 0)}
                        helpText="Lower numbers have higher priority"
                      />
                    </div>
                    
                    <div style={{ flex: 1, paddingTop: '24px' }}>
                      <Checkbox
                        label="Active"
                        checked={discount.isActive}
                        onChange={(value) => updateDiscount(index, 'isActive', value)}
                      />
                    </div>
                  </HorizontalStack>
                </FormLayout>
              </VerticalStack>
            </div>
          </Card>
        ))
      )}
    </VerticalStack>
  );
}

export default DiscountRuleForm;