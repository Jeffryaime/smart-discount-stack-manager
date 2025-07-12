import React, { useState, useEffect } from 'react';
import {
	Page,
	Card,
	FormLayout,
	TextField,
	Select,
	Button,
	HorizontalStack,
	Checkbox,
	Banner,
	TextContainer,
	Text,
} from '@shopify/polaris';
import apiClient from '../services/api';
import AppLayout from '../components/AppLayout';

function Settings() {
	const [settings, setSettings] = useState({
		defaultDiscountType: 'percentage',
		enableTestMode: true,
		enableNotifications: true,
		notificationEmail: '',
		maxDiscountsPerStack: '10',
		autoDeactivateExpired: true,
		webhookEndpoint: '',
		enableDebugMode: false,
	});

	const [saved, setSaved] = useState(false);
	const [webhookError, setWebhookError] = useState('');
	const [emailError, setEmailError] = useState('');
	const [maxDiscountsError, setMaxDiscountsError] = useState('');
	const [saveError, setSaveError] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	// useEffect to handle the saved state timeout with cleanup
	useEffect(() => {
		let timeoutId;

		if (saved) {
			timeoutId = setTimeout(() => {
				setSaved(false);
			}, 3000);
		}

		// Cleanup function to clear timeout when component unmounts or saved changes
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [saved]);

	// URL validation function
	const isValidUrl = (url) => {
		if (!url) return true; // Empty URLs are valid (optional field)

		try {
			const urlObj = new URL(url);
			return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
		} catch (error) {
			return false;
		}
	};

	// Email validation function
	const isValidEmail = (email) => {
		if (!email) return true; // Empty emails are valid (optional field)

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	// Max discounts validation function
	const isValidMaxDiscounts = (value) => {
		if (!value) return false; // Empty value is not valid for this field

		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && numValue > 0 && numValue <= 100;
	};

	const handleSettingChange = (field, value) => {
		setSettings((prev) => ({
			...prev,
			[field]: value,
		}));
		setSaved(false);

		// Validate webhook URL
		if (field === 'webhookEndpoint') {
			if (value && !isValidUrl(value)) {
				setWebhookError(
					'Please enter a valid URL (e.g., https://example.com/webhook)'
				);
			} else {
				setWebhookError('');
			}
		}

		// Validate email
		if (field === 'notificationEmail') {
			if (value && !isValidEmail(value)) {
				setEmailError('Please enter a valid email address');
			} else {
				setEmailError('');
			}
		}

		// Validate max discounts per stack
		if (field === 'maxDiscountsPerStack') {
			if (!isValidMaxDiscounts(value)) {
				setMaxDiscountsError('Please enter a number between 1 and 100');
			} else {
				setMaxDiscountsError('');
			}
		}
	};

	const handleSave = async () => {
		// Prevent multiple concurrent save operations
		if (isSaving) {
			return;
		}

		// Check if webhook URL is valid before saving
		if (settings.webhookEndpoint && !isValidUrl(settings.webhookEndpoint)) {
			setWebhookError('Please enter a valid URL before saving');
			return;
		}

		// Check if max discounts is valid before saving
		if (!isValidMaxDiscounts(settings.maxDiscountsPerStack)) {
			setMaxDiscountsError(
				'Please enter a valid number between 1 and 100 before saving'
			);
			return;
		}

		// Clear any previous errors
		setSaveError('');
		setIsSaving(true);

		try {
			// Save settings to backend
			await apiClient.post('/settings', settings);

			// Success handling
			setSaved(true);
		} catch (error) {
			// Error handling
			console.error('Failed to save settings:', error);

			let errorMessage = 'Failed to save settings. Please try again.';

			if (error.response) {
				// Server responded with error status
				if (error.response.status === 400) {
					errorMessage = 'Invalid settings data. Please check your inputs.';
				} else if (error.response.status === 401) {
					errorMessage = 'Authentication required. Please log in again.';
				} else if (error.response.status === 403) {
					errorMessage = 'You do not have permission to save settings.';
				} else if (error.response.status === 500) {
					errorMessage = 'Server error. Please try again later.';
				} else if (error.response.data && error.response.data.message) {
					errorMessage = error.response.data.message;
				}
			} else if (error.request) {
				// Network error
				errorMessage =
					'Network error. Please check your connection and try again.';
			}

			setSaveError(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const discountTypeOptions = [
		{ label: 'Percentage', value: 'percentage' },
		{ label: 'Fixed Amount', value: 'fixed' },
		{ label: 'Free Shipping', value: 'shipping' },
	];

	return (
		<AppLayout>
			<Page title="Settings" breadcrumbs={[{ content: 'Dashboard', url: '/' }]}>
			{saved && (
				<Banner status="success" onDismiss={() => setSaved(false)}>
					<p>Settings saved successfully</p>
				</Banner>
			)}

			{saveError && (
				<Banner status="critical" onDismiss={() => setSaveError('')}>
					<p>{saveError}</p>
				</Banner>
			)}

			<Card>
				<Card.Section>
					<TextContainer>
						<Text variant="headingLg">General Settings</Text>
					</TextContainer>
				</Card.Section>
				<Card.Section>
					<FormLayout>
						<Select
							label="Default Discount Type"
							options={discountTypeOptions}
							value={settings.defaultDiscountType}
							onChange={(value) =>
								handleSettingChange('defaultDiscountType', value)
							}
							helpText="Default discount type when creating new discounts"
						/>

						<TextField
							label="Maximum Discounts per Stack"
							type="number"
							value={settings.maxDiscountsPerStack}
							onChange={(value) =>
								handleSettingChange('maxDiscountsPerStack', value)
							}
							helpText="Limit the number of discounts that can be added to a single stack (1-100)"
							autoComplete="off"
							error={maxDiscountsError}
						/>

						<Checkbox
							label="Enable Test Mode"
							checked={settings.enableTestMode}
							onChange={(value) => handleSettingChange('enableTestMode', value)}
							helpText="Allow testing discount stacks before making them live"
						/>

						<Checkbox
							label="Auto-deactivate Expired Discounts"
							checked={settings.autoDeactivateExpired}
							onChange={(value) =>
								handleSettingChange('autoDeactivateExpired', value)
							}
							helpText="Automatically deactivate discount stacks when they reach their end date"
						/>
					</FormLayout>
				</Card.Section>
			</Card>

			<Card>
				<Card.Section>
					<TextContainer>
						<Text variant="headingLg">Notifications</Text>
					</TextContainer>
				</Card.Section>
				<Card.Section>
					<FormLayout>
						<Checkbox
							label="Enable Email Notifications"
							checked={settings.enableNotifications}
							onChange={(value) =>
								handleSettingChange('enableNotifications', value)
							}
							helpText="Receive notifications about discount usage and errors"
						/>

						{settings.enableNotifications && (
							<TextField
								label="Notification Email"
								type="email"
								value={settings.notificationEmail}
								onChange={(value) =>
									handleSettingChange('notificationEmail', value)
								}
								helpText="Email address for receiving notifications"
								autoComplete="email"
								error={emailError}
							/>
						)}
					</FormLayout>
				</Card.Section>
			</Card>

			<Card>
				<Card.Section>
					<TextContainer>
						<Text variant="headingLg">Developer Settings</Text>
					</TextContainer>
				</Card.Section>
				<Card.Section>
					<FormLayout>
						<TextField
							label="Webhook Endpoint"
							type="url"
							value={settings.webhookEndpoint}
							onChange={(value) =>
								handleSettingChange('webhookEndpoint', value)
							}
							helpText="Optional webhook endpoint for discount events"
							autoComplete="off"
							error={webhookError}
						/>

						<Checkbox
							label="Enable Debug Mode"
							checked={settings.enableDebugMode}
							onChange={(value) =>
								handleSettingChange('enableDebugMode', value)
							}
							helpText="Show detailed logging information in the console"
						/>
					</FormLayout>
				</Card.Section>
			</Card>

			<HorizontalStack align="end">
				<Button
					primary
					onClick={handleSave}
					loading={isSaving}
					disabled={isSaving}
				>
					{isSaving ? 'Saving...' : 'Save Settings'}
				</Button>
			</HorizontalStack>
			</Page>
		</AppLayout>
	);
}

export default Settings;
