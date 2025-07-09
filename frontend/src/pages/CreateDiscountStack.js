import React, { useState } from 'react';
import {
  Page,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Stack,
  Checkbox,
  Select,
  Banner,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useCreateDiscountStack } from '../hooks/useDiscountStacks';
import DiscountRuleForm from '../components/DiscountRuleForm';

function CreateDiscountStack() {
  const navigate = useNavigate();
  const createDiscountStack = useCreateDiscountStack();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    discounts: [],
    startDate: '',
    endDate: '',
    usageLimit: '',
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    if (!formData.name) validationErrors.name = 'Name is required';
    if (formData.discounts.length === 0) validationErrors.discounts = 'At least one discount is required';
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    createDiscountStack.mutate(formData, {
      onSuccess: () => {
        navigate('/discount-stacks');
      },
      onError: (error) => {
        console.error('Error creating discount stack:', error);
      }
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleDiscountsChange = (discounts) => {
    setFormData(prev => ({
      ...prev,
      discounts
    }));
    
    if (errors.discounts) {
      setErrors(prev => ({
        ...prev,
        discounts: null
      }));
    }
  };

  return (
    <Page
      title="Create Discount Stack"
      breadcrumbs={[
        { content: 'Discount Stacks', url: '/discount-stacks' },
      ]}
    >
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <Card>
            <Card.Section>
              <FormLayout>
                <TextField
                  label="Name"
                  value={formData.name}
                  onChange={(value) => handleFieldChange('name', value)}
                  error={errors.name}
                  autoComplete="off"
                />
                
                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(value) => handleFieldChange('description', value)}
                  multiline={3}
                  autoComplete="off"
                />
                
                <Checkbox
                  label="Active"
                  checked={formData.isActive}
                  onChange={(value) => handleFieldChange('isActive', value)}
                />
              </FormLayout>
            </Card.Section>
          </Card>

          <Card>
            <Card.Section>
              <DiscountRuleForm
                discounts={formData.discounts}
                onChange={handleDiscountsChange}
                error={errors.discounts}
              />
            </Card.Section>
          </Card>

          <Card>
            <Card.Section>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={formData.startDate}
                    onChange={(value) => handleFieldChange('startDate', value)}
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onChange={(value) => handleFieldChange('endDate', value)}
                    autoComplete="off"
                  />
                </FormLayout.Group>
                
                <TextField
                  label="Usage Limit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(value) => handleFieldChange('usageLimit', value)}
                  helpText="Leave empty for unlimited usage"
                  autoComplete="off"
                />
              </FormLayout>
            </Card.Section>
          </Card>

          <Stack distribution="trailing">
            <Button onClick={() => navigate('/discount-stacks')}>
              Cancel
            </Button>
            <Button
              primary
              submit
              loading={createDiscountStack.isLoading}
            >
              Create Discount Stack
            </Button>
          </Stack>
        </FormLayout>
      </Form>
    </Page>
  );
}

export default CreateDiscountStack;