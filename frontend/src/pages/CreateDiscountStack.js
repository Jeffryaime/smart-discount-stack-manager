import React, { useState } from 'react';
import {
	Page,
	Card,
	Form,
	FormLayout,
	TextField,
	Button,
	HorizontalStack,
	VerticalStack,
	Text,
	Checkbox,
	Banner,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useCreateDiscountStack } from '../hooks/useDiscountStacks';
import DiscountRuleForm from '../components/DiscountRuleForm';
import { navigateWithShop } from '../utils/navigation';
import AppLayout from '../components/AppLayout';

function CreateDiscountStack() {
	const navigate = useNavigate();
	const createDiscountStack = useCreateDiscountStack();

	const [formData, setFormData] = useState({
		name: '',
		description: '',
		isActive: true,
		stopOnFirstFailure: false,
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
		if (formData.discounts.length === 0) validationErrors.discounts = 'At least one discount rule is required';

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		console.log('Submitting form data:', formData);
		createDiscountStack.mutate(formData, {
			onSuccess: (data) => {
				console.log('Success:', data);
				navigateWithShop(navigate, '/discount-stacks');
			},
			onError: (error) => {
				console.error('Error creating discount stack:', error);
				// Handle validation errors from backend
				if (error.response?.status === 400 && error.response?.data?.details) {
					setErrors({
						submit: error.response.data.details.join('. '),
					});
				} else {
					setErrors({
						submit: 'Failed to create discount stack. Please try again.',
					});
				}
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
		<AppLayout>
			<Page
			title="Create Discount Stack"
			breadcrumbs={[{ content: 'Discount Stacks', url: '/discount-stacks' }]}
		>
			{errors.submit && <Banner status="critical">{errors.submit}</Banner>}
			<Form onSubmit={handleSubmit}>
				<VerticalStack gap="6">
					<Card>
						<div style={{ padding: '24px' }}>
							<VerticalStack gap="4">
								<Text variant="headingMd">Basic Information</Text>
								<FormLayout>
									<TextField
										label="Name"
										value={formData.name}
										onChange={(value) => handleFieldChange('name', value)}
										error={errors.name}
										autoComplete="off"
										placeholder="Enter a name for your discount stack"
									/>

									<TextField
										label="Description"
										value={formData.description}
										onChange={(value) => handleFieldChange('description', value)}
										multiline={3}
										autoComplete="off"
										placeholder="Describe what this discount stack does"
									/>

									<Checkbox
										label="Active"
										checked={formData.isActive}
										onChange={(value) => handleFieldChange('isActive', value)}
										helpText="Toggle to activate/deactivate this discount stack"
									/>
								</FormLayout>
							</VerticalStack>
						</div>
					</Card>

					<Card>
						<div style={{ padding: '24px' }}>
							<DiscountRuleForm
								discounts={formData.discounts}
								onChange={handleDiscountsChange}
								error={errors.discounts}
							/>
						</div>
					</Card>

					<Card>
						<div style={{ padding: '24px' }}>
							<VerticalStack gap="4">
								<Text variant="headingMd">Schedule & Limits</Text>
								<FormLayout>
									<HorizontalStack gap="4">
										<div style={{ flex: 1 }}>
											<TextField
												label="Start Date"
												type="date"
												value={formData.startDate}
												onChange={(value) => handleFieldChange('startDate', value)}
												max={formData.endDate || undefined}
												autoComplete="off"
												helpText="Optional start date for the discount"
											/>
										</div>
										<div style={{ flex: 1 }}>
											<TextField
												label="End Date"
												type="date"
												value={formData.endDate}
												onChange={(value) => handleFieldChange('endDate', value)}
												min={formData.startDate || undefined}
												autoComplete="off"
												helpText="Optional end date for the discount"
											/>
										</div>
									</HorizontalStack>

									<TextField
										label="Usage Limit"
										type="number"
										value={formData.usageLimit}
										onChange={(value) => handleFieldChange('usageLimit', value)}
										helpText="Leave empty for unlimited usage"
										autoComplete="off"
										placeholder="e.g., 100"
									/>
								</FormLayout>
							</VerticalStack>
						</div>
					</Card>

					<Card>
						<div style={{ padding: '24px' }}>
							<VerticalStack gap="4">
								<Text variant="headingMd">Advanced Settings</Text>
								<FormLayout>
									<Checkbox
										label="Stop on First Failure"
										checked={formData.stopOnFirstFailure}
										onChange={(value) => handleFieldChange('stopOnFirstFailure', value)}
										helpText="When enabled, if a higher priority discount cannot be applied, all lower priority discounts will be skipped. Default behavior applies each discount independently."
									/>
								</FormLayout>
							</VerticalStack>
						</div>
					</Card>

					<div style={{ padding: '24px', borderTop: '1px solid #e1e3e5', backgroundColor: '#fafbfb' }}>
						<HorizontalStack align="end" gap="3">
							<Button onClick={() => navigateWithShop(navigate, '/discount-stacks')} size="large">
								Cancel
							</Button>
							<Button primary submit loading={createDiscountStack.isLoading} size="large">
								Create Discount Stack
							</Button>
						</HorizontalStack>
					</div>
				</VerticalStack>
			</Form>
			</Page>
		</AppLayout>
	);
}

export default CreateDiscountStack;
