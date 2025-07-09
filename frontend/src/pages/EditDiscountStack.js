import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  HorizontalStack,
  Checkbox,
  Banner,
  SkeletonPage,
  SkeletonBodyText,
} from '@shopify/polaris';
import { useNavigate, useParams } from 'react-router-dom';
import { useDiscountStack, useUpdateDiscountStack } from '../hooks/useDiscountStacks';
import DiscountRuleForm from '../components/DiscountRuleForm';

function EditDiscountStack() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: discountStack, isLoading, error } = useDiscountStack(id);
  const updateDiscountStack = useUpdateDiscountStack();
  
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

  useEffect(() => {
    if (discountStack) {
      setFormData({
        name: discountStack.name || '',
        description: discountStack.description || '',
        isActive: discountStack.isActive !== undefined ? discountStack.isActive : true,
        discounts: discountStack.discounts || [],
        startDate: discountStack.startDate ? discountStack.startDate.split('T')[0] : '',
        endDate: discountStack.endDate ? discountStack.endDate.split('T')[0] : '',
        usageLimit: discountStack.usageLimit || '',
      });
    }
  }, [discountStack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    if (!formData.name) validationErrors.name = 'Name is required';
    if (formData.discounts.length === 0) validationErrors.discounts = 'At least one discount is required';
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    updateDiscountStack.mutate({ id, data: formData }, {
      onSuccess: () => {
        navigate('/discount-stacks');
      },
      onError: (error) => {
        console.error('Error updating discount stack:', error);
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

  if (isLoading) {
    return (
      <SkeletonPage primaryAction title="Edit Discount Stack">
        <Card>
          <Card.Section>
            <SkeletonBodyText />
          </Card.Section>
        </Card>
      </SkeletonPage>
    );
  }

  if (error) {
    return (
      <Page
        title="Edit Discount Stack"
        breadcrumbs={[
          { content: 'Discount Stacks', url: '/discount-stacks' },
        ]}
      >
        <Banner status="critical">
          <p>Error loading discount stack: {error.message}</p>
        </Banner>
        <HorizontalStack align="end">
          <Button onClick={() => navigate('/discount-stacks')}>
            Back to Discount Stacks
          </Button>
        </HorizontalStack>
      </Page>
    );
  }

  return (
    <Page
      title="Edit Discount Stack"
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

          <HorizontalStack align="end">
            <Button onClick={() => navigate('/discount-stacks')}>
              Cancel
            </Button>
            <Button
              primary
              submit
              loading={updateDiscountStack.isLoading}
            >
              Update Discount Stack
            </Button>
          </HorizontalStack>
        </FormLayout>
      </Form>
    </Page>
  );
}

export default EditDiscountStack;