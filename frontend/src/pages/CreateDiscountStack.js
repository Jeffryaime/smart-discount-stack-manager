import React, { useState } from 'react';
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
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useCreateDiscountStack } from '../hooks/useDiscountStacks';

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
		// Temporarily removed discount validation until DiscountRuleForm is restored
		// if (formData.discounts.length === 0) validationErrors.discounts = 'At least one discount is required';

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		console.log('Submitting form data:', formData);
		createDiscountStack.mutate(formData, {
			onSuccess: (data) => {
				console.log('Success:', data);
				navigate('/discount-stacks');
			},
			onError: (error) => {
				console.error('Error creating discount stack:', error);
				// Show error to user
				setErrors({
					submit: 'Failed to create discount stack. Please try again.',
				});
			},
		});
	};

	const handleFieldChange = (field, value) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		if (errors[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: null,
			}));
		}
	};

	const handleDiscountsChange = (discounts) => {
		setFormData((prev) => ({
			...prev,
			discounts,
		}));

		if (errors.discounts) {
			setErrors((prev) => ({
				...prev,
				discounts: null,
			}));
		}
	};

	return (
		<Page
			title="Create Discount Stack"
			breadcrumbs={[{ content: 'Discount Stacks', url: '/discount-stacks' }]}
		>
			{errors.submit && <Banner status="critical">{errors.submit}</Banner>}
			<Form onSubmit={handleSubmit}>
				<FormLayout>
					<Card>
						<div style={{ padding: '20px' }}>
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
						</div>
					</Card>

					<Card>
						<div style={{ padding: '20px' }}>
							<p>Discount rules form will be here</p>
						</div>
					</Card>

					<Card>
						<div style={{ padding: '20px' }}>
							<FormLayout>
								<TextField
									label="Start Date"
									type="date"
									value={formData.startDate}
									onChange={(value) => handleFieldChange('startDate', value)}
									max={formData.endDate || undefined}
									autoComplete="off"
								/>

								<TextField
									label="End Date"
									type="date"
									value={formData.endDate}
									onChange={(value) => handleFieldChange('endDate', value)}
									min={formData.startDate || undefined}
									autoComplete="off"
								/>

								<TextField
									label="Usage Limit"
									type="number"
									value={formData.usageLimit}
									onChange={(value) => handleFieldChange('usageLimit', value)}
									helpText="Leave empty for unlimited usage"
									autoComplete="off"
								/>
							</FormLayout>
						</div>
					</Card>

					<HorizontalStack align="end">
						<Button onClick={() => navigate('/discount-stacks')}>Cancel</Button>
						<Button primary submit loading={createDiscountStack.isLoading}>
							Create Discount Stack
						</Button>
					</HorizontalStack>
				</FormLayout>
			</Form>
		</Page>
	);
}

export default CreateDiscountStack;
