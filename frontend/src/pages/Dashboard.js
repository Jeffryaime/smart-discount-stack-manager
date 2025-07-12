import React, { useState, useEffect } from 'react';
import {
	Page,
	Layout,
	Card,
	Text,
	HorizontalStack,
	VerticalStack,
	Icon,
	Box,
	Spinner,
} from '@shopify/polaris';
import {
	ProductsMajor,
	CashDollarMajor,
	OrdersMajor,
} from '@shopify/polaris-icons';
import AppLayout from '../components/AppLayout';

function Dashboard() {
	const [metrics, setMetrics] = useState({
		activeStacks: 12,
		totalSavings: 3247,
		ordersWithDiscounts: 847,
	});
	const [loading, setLoading] = useState(false);

	// Simulate API call for metrics
	useEffect(() => {
		// This would be replaced with actual API call
		setLoading(false);
	}, []);

	const renderMetricCard = (
		title,
		value,
		changeText,
		changeColor,
		icon,
		iconColor
	) => (
		<Card>
			<Box padding="400">
				<HorizontalStack align="space-between" blockAlign="start">
					<VerticalStack gap="2">
						<Text variant="bodyMd" color="subdued" as="p">
							{title}
						</Text>
						<Text variant="heading2xl" as="h3">
							{loading ? <Spinner size="small" /> : value}
						</Text>
						{changeText && !loading && (
							<Text variant="bodySm" color={changeColor} as="p">
								{changeText}
							</Text>
						)}
					</VerticalStack>
					<div
						style={{
							backgroundColor: iconColor,
							borderRadius: '8px',
							padding: '12px',
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							minWidth: '40px',
							minHeight: '40px',
						}}
					>
						<Icon source={icon} tone="base" />
					</div>
				</HorizontalStack>
			</Box>
		</Card>
	);

	return (
		<AppLayout>
			<Page
				title="Dashboard"
				subtitle="Overview of your discount stacks and performance metrics"
			>
				<Layout>
					<Layout.Section>
						<VerticalStack gap="4">
							{renderMetricCard(
								'Active Stacks',
								metrics.activeStacks,
								'+2 from last week',
								'success',
								ProductsMajor,
								'#00A047'
							)}
							{renderMetricCard(
								'Total Savings',
								`$${metrics.totalSavings.toLocaleString()}`,
								'+12% from last month',
								'success',
								CashDollarMajor,
								'#00A047'
							)}
							{renderMetricCard(
								'Orders with Discounts',
								metrics.ordersWithDiscounts.toLocaleString(),
								'+8% from last month',
								'success',
								OrdersMajor,
								'#0070F3'
							)}
						</VerticalStack>
					</Layout.Section>
				</Layout>
			</Page>
		</AppLayout>
	);
}

export default Dashboard;
