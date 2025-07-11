import React, { useState, useEffect } from 'react';
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
	SkeletonPage,
	SkeletonBodyText,
} from '@shopify/polaris';
import { useNavigate, useParams } from 'react-router-dom';
import {
	useDiscountStack,
	useUpdateDiscountStack,
} from '../hooks/useDiscountStacks';
import DiscountRuleForm from '../components/DiscountRuleForm';

// Helper function to safely parse date strings
const parseDateString = (dateString) => {
	if (!dateString) return '';

	try {
		// Try to parse as ISO string first
		if (dateString.includes('T')) {
			return dateString.split('T')[0];
		}

		// Try to parse as Date object and format as YYYY-MM-DD
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return '';
		}

		return date.toISOString().split('T')[0];
	} catch (error) {
		console.warn('Failed to parse date string:', dateString, error);
		return '';
	}
};

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
				isActive:
					discountStack.isActive !== undefined ? discountStack.isActive : true,
				stopOnFirstFailure:
					discountStack.stopOnFirstFailure !== undefined ? discountStack.stopOnFirstFailure : false,
				discounts: discountStack.discounts || [],
				startDate: parseDateString(discountStack.startDate),
				endDate: parseDateString(discountStack.endDate),
				usageLimit: discountStack.usageLimit || '',
			});
		}
	}, [discountStack]);

	// Helper function to validate date range
	const validateDateRange = (startDate, endDate) => {
		if (!startDate || !endDate) return null;

		const start = new Date(startDate);
		const end = new Date(endDate);

		if (start > end) {
			return 'End date must be after start date';
		}

		return null;
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		const validationErrors = {};
		if (!formData.name) validationErrors.name = 'Name is required';
		if (formData.discounts.length === 0) validationErrors.discounts = 'At least one discount rule is required';

		// Validate usage limit
		if (formData.usageLimit !== '') {
			const numValue = parseFloat(formData.usageLimit);
			if (isNaN(numValue) || numValue <= 0) {
				validationErrors.usageLimit = 'Usage limit must be a positive number';
			}
		}

		// Validate date range
		const dateRangeError = validateDateRange(
			formData.startDate,
			formData.endDate
		);
		if (dateRangeError) {
			validationErrors.endDate = dateRangeError;
		}

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		updateDiscountStack.mutate(
			{ id, data: formData },
			{
				onSuccess: () => {
					navigate('/discount-stacks');
				},
				onError: (error) => {
					console.error('Error updating discount stack:', error);
					// Handle validation errors from backend
					if (error.response?.status === 400 && error.response?.data?.details) {
						setErrors({
							submit: error.response.data.details.join('. '),
						});
					} else {
						setErrors({
							submit: 'Failed to update discount stack. Please try again.',
						});
					}
				},
			}
		);
	};

	const handleFieldChange = (field, value) => {
		// Validate usage limit for positive numbers
		if (field === 'usageLimit' && value !== '') {
			const numValue = parseFloat(value);
			if (isNaN(numValue) || numValue <= 0) {
				setErrors((prev) => ({
					...prev,
					usageLimit: 'Usage limit must be a positive number',
				}));
				return; // Don't update formData if validation fails
			}
		}

		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		// Clear existing field error
		if (errors[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: null,
			}));
		}

		// Validate date range in real-time when either date changes
		if (field === 'startDate' || field === 'endDate') {
			const startDate = field === 'startDate' ? value : formData.startDate;
			const endDate = field === 'endDate' ? value : formData.endDate;

			const dateRangeError = validateDateRange(startDate, endDate);
			if (dateRangeError) {
				setErrors((prev) => ({
					...prev,
					endDate: dateRangeError,
				}));
			} else if (
				errors.endDate &&
				errors.endDate.includes('End date must be after start date')
			) {
				// Clear the date range error if it's resolved
				setErrors((prev) => ({
					...prev,
					endDate: null,
				}));
			}
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

	if (isLoading) {
		return (
			<SkeletonPage primaryAction title="Edit Discount Stack">
				<Card>
					<div style={{ padding: '20px' }}>
						<SkeletonBodyText />
					</div>
				</Card>
			</SkeletonPage>
		);
	}

	if (error) {
		return (
			<Page
				title="Edit Discount Stack"
				breadcrumbs={[{ content: 'Discount Stacks', url: '/discount-stacks' }]}
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
			breadcrumbs={[{ content: 'Discount Stacks', url: '/discount-stacks' }]}
		>
			{errors.submit && (
				<Banner status="critical">
					{errors.submit}
				</Banner>
			)}
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
												error={errors.endDate}
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
										error={errors.usageLimit}
										helpText="Leave empty for unlimited usage"
										autoComplete="off"
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
							<Button onClick={() => navigate('/discount-stacks')} size="large">
								Cancel
							</Button>
							<Button primary submit loading={updateDiscountStack.isLoading} size="large">
								Update Discount Stack
							</Button>
						</HorizontalStack>
					</div>
				</VerticalStack>
			</Form>
		</Page>
	);
}

export default EditDiscountStack;
