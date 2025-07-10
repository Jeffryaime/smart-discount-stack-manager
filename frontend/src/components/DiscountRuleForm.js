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
} from '@shopify/polaris';

function DiscountRuleForm({ discounts = [], onChange, error }) {
  const discountTypes = [
    { label: 'Percentage Off', value: 'percentage' },
    { label: 'Fixed Amount Off', value: 'fixed_amount' },
    { label: 'Buy X Get Y Free', value: 'buy_x_get_y' },
  ];

  const addDiscount = () => {
    const newDiscount = {
      id: Date.now().toString(),
      type: 'percentage',
      value: 0,
      conditions: {
        minimumAmount: '',
        minimumQuantity: '',
        productIds: [],
        collectionIds: [],
      },
      priority: discounts.length,
      isActive: true,
    };
    
    onChange([...discounts, newDiscount]);
  };

  const validateDiscountValue = (type, value) => {
    if (type === 'percentage' && (value < 0 || value > 100)) {
      return 'Percentage must be between 0 and 100';
    }
    if ((type === 'fixed_amount' || type === 'buy_x_get_y') && value < 0) {
      return 'Amount must be greater than 0';
    }
    return null;
  };

  const updateDiscount = (index, field, value) => {
    const updatedDiscounts = [...discounts];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedDiscounts[index][parent][child] = value;
    } else {
      updatedDiscounts[index][field] = value;
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
                      Priority: {discount.priority + 1} (higher numbers apply first)
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
                      <TextField
                        label={discount.type === 'percentage' ? 'Percentage Off' : 'Amount Off'}
                        type="number"
                        value={discount.value}
                        onChange={(value) => updateDiscount(index, 'value', parseFloat(value) || 0)}
                        suffix={discount.type === 'percentage' ? '%' : '$'}
                        error={discount.error}
                        helpText={
                          discount.type === 'percentage' 
                            ? "Enter 0-100 (e.g., 20 for 20% off)"
                            : "Enter amount (e.g., 10 for $10 off)"
                        }
                        placeholder={
                          discount.type === 'percentage' ? "20" : "10"
                        }
                      />
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
                            value={discount.conditions.minimumAmount}
                            onChange={(value) => updateDiscount(index, 'conditions.minimumAmount', value)}
                            prefix="$"
                            helpText="Customer must spend at least this amount"
                            placeholder="50"
                          />
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Minimum Item Quantity"
                            type="number"
                            value={discount.conditions.minimumQuantity}
                            onChange={(value) => updateDiscount(index, 'conditions.minimumQuantity', value)}
                            helpText="Customer must have at least this many items"
                            placeholder="2"
                          />
                        </div>
                      </HorizontalStack>
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