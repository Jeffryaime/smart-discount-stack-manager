import React from 'react';
import {
  Card,
  Button,
  Stack,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Heading,
  Banner,
} from '@shopify/polaris';

function DiscountRuleForm({ discounts, onChange, error }) {
  const discountTypes = [
    { label: 'Percentage', value: 'percentage' },
    { label: 'Fixed Amount', value: 'fixed_amount' },
    { label: 'Buy X Get Y', value: 'buy_x_get_y' },
    { label: 'Free Shipping', value: 'free_shipping' },
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

  const updateDiscount = (index, field, value) => {
    const updatedDiscounts = [...discounts];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedDiscounts[index][parent][child] = value;
    } else {
      updatedDiscounts[index][field] = value;
    }
    onChange(updatedDiscounts);
  };

  const removeDiscount = (index) => {
    const updatedDiscounts = discounts.filter((_, i) => i !== index);
    onChange(updatedDiscounts);
  };

  return (
    <Stack vertical spacing="loose">
      <Stack distribution="equalSpacing" alignment="center">
        <Heading>Discount Rules</Heading>
        <Button onClick={addDiscount}>Add Discount</Button>
      </Stack>

      {error && (
        <Banner status="critical">
          {error}
        </Banner>
      )}

      {discounts.map((discount, index) => (
        <Card key={discount.id} sectioned>
          <Stack vertical spacing="loose">
            <Stack distribution="equalSpacing" alignment="center">
              <Heading size="small">Discount {index + 1}</Heading>
              <Button
                plain
                destructive
                onClick={() => removeDiscount(index)}
              >
                Remove
              </Button>
            </Stack>

            <FormLayout>
              <FormLayout.Group>
                <Select
                  label="Type"
                  options={discountTypes}
                  value={discount.type}
                  onChange={(value) => updateDiscount(index, 'type', value)}
                />
                
                <TextField
                  label={discount.type === 'percentage' ? 'Percentage' : 'Amount'}
                  type="number"
                  value={discount.value}
                  onChange={(value) => updateDiscount(index, 'value', parseFloat(value) || 0)}
                  suffix={discount.type === 'percentage' ? '%' : '$'}
                />
              </FormLayout.Group>

              <FormLayout.Group>
                <TextField
                  label="Minimum Amount"
                  type="number"
                  value={discount.conditions.minimumAmount}
                  onChange={(value) => updateDiscount(index, 'conditions.minimumAmount', value)}
                  prefix="$"
                />
                
                <TextField
                  label="Minimum Quantity"
                  type="number"
                  value={discount.conditions.minimumQuantity}
                  onChange={(value) => updateDiscount(index, 'conditions.minimumQuantity', value)}
                />
              </FormLayout.Group>

              <FormLayout.Group>
                <TextField
                  label="Priority"
                  type="number"
                  value={discount.priority}
                  onChange={(value) => updateDiscount(index, 'priority', parseInt(value) || 0)}
                  helpText="Lower numbers have higher priority"
                />
                
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                  <Checkbox
                    label="Active"
                    checked={discount.isActive}
                    onChange={(value) => updateDiscount(index, 'isActive', value)}
                  />
                </div>
              </FormLayout.Group>
            </FormLayout>
          </Stack>
        </Card>
      ))}

      {discounts.length === 0 && (
        <Card sectioned>
          <Stack vertical spacing="loose" alignment="center">
            <Heading>No discount rules added yet</Heading>
            <Button primary onClick={addDiscount}>
              Add Your First Discount
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

export default DiscountRuleForm;