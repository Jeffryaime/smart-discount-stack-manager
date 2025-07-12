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
	Button,
	ResourceList,
	ResourceItem,
} from '@shopify/polaris';
import {
	ProductsMajor,
	CashDollarMajor,
	OrdersMajor,
	AnalyticsMajor,
	PaymentsMajor,
	CircleTickMajor,
	CircleTickMinor,
	AlertMinor,
	PauseMinor,
	ClipboardMinor,
} from '@shopify/polaris-icons';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { navigateWithShop } from '../utils/navigation';
import { dashboardApi } from '../services/api';

function Dashboard() {
	const navigate = useNavigate();
	const [metrics, setMetrics] = useState({
		activeStacks: 0,
		totalSavings: 0,
		ordersWithDiscounts: 0,
		conversionRate: 0,
		aovWithDiscount: 0,
	});

	const [topPerformingStack, setTopPerformingStack] = useState({
		name: '',
		orders: 0,
		savingsGenerated: 0,
		id: '',
	});

	const [recentActivity, setRecentActivity] = useState([]);
	const [loading, setLoading] = useState(true);

	// Fetch dashboard data on component mount
	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);

				// Fetch all dashboard data in parallel
				const [metricsData, topPerformingData, activityData] =
					await Promise.all([
						dashboardApi.getMetrics(),
						dashboardApi.getTopPerformingStack(),
						dashboardApi.getRecentActivity(),
					]);

				setMetrics(metricsData);
				setTopPerformingStack(topPerformingData);
				setRecentActivity(activityData);
			} catch (error) {
				console.error('Error fetching dashboard data:', error);
				// Keep default state values on error
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
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
							{value}
						</Text>
						{changeText && (
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

	const renderActivityItem = (activity) => (
		<ResourceItem
			id={activity.id}
			accessibilityLabel={`Activity: ${activity.message}`}
		>
			<VerticalStack gap="1">
				<Text variant="bodyMd" fontWeight="medium" as="p">
					{activity.message}
				</Text>
				<Text variant="bodySm" color="subdued" as="p">
					{activity.timestamp}
				</Text>
			</VerticalStack>
		</ResourceItem>
	);

	// Show loading spinner if data is still loading
	if (loading) {
		return (
			<AppLayout>
				<Page title="Dashboard">
					<Layout>
						<Layout.Section>
							<Card>
								<Box padding="400">
									<HorizontalStack align="center" blockAlign="center">
										<Spinner size="large" />
										<Text variant="bodyMd" as="p">
											Loading dashboard data...
										</Text>
									</HorizontalStack>
								</Box>
							</Card>
						</Layout.Section>
					</Layout>
				</Page>
			</AppLayout>
		);
	}

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
							{renderMetricCard(
								'Conversion Rate',
								`${metrics.conversionRate}%`,
								'+0.4% from last month',
								'success',
								AnalyticsMajor,
								'#6B46C1'
							)}
							{renderMetricCard(
								'AOV with Discount',
								`$${metrics.aovWithDiscount}`,
								'+5% from last month',
								'success',
								PaymentsMajor,
								'#DC2626'
							)}
						</VerticalStack>
					</Layout.Section>

					{/* Top Performing Stack */}
					{topPerformingStack.id && (
						<Layout.Section>
							<Card>
								<Box padding="400">
									<VerticalStack gap="4">
										<HorizontalStack align="space-between" blockAlign="start">
											<HorizontalStack gap="3" blockAlign="center">
												<div
													style={{
														backgroundColor: '#FFD700',
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
													<Icon source={CircleTickMajor} tone="base" />
												</div>
												<VerticalStack gap="1">
													<Text
														variant="headingMd"
														as="h3"
														fontWeight="semibold"
													>
														Top Performing Stack
													</Text>
													<Text variant="bodyMd" color="subdued" as="p">
														Your best converting discount stack
													</Text>
												</VerticalStack>
											</HorizontalStack>
											<Button
												onClick={() =>
													navigateWithShop(
														navigate,
														`/discount-stacks/${topPerformingStack.id}`
													)
												}
												size="slim"
											>
												View Stack Details
											</Button>
										</HorizontalStack>

										<Box
											background="bg-surface-secondary"
											padding="300"
											borderRadius="2"
										>
											<VerticalStack gap="3">
												<Text variant="headingSm" as="h4" fontWeight="medium">
													{topPerformingStack.name}
												</Text>
												<HorizontalStack gap="6">
													<VerticalStack gap="1">
														<Text variant="bodySm" color="subdued" as="p">
															Orders
														</Text>
														<Text variant="bodyMd" fontWeight="semibold" as="p">
															{topPerformingStack.orders.toLocaleString()}
														</Text>
													</VerticalStack>
													<VerticalStack gap="1">
														<Text variant="bodySm" color="subdued" as="p">
															Savings Generated
														</Text>
														<Text variant="bodyMd" fontWeight="semibold" as="p">
															$
															{topPerformingStack.savingsGenerated.toLocaleString()}
														</Text>
													</VerticalStack>
												</HorizontalStack>
											</VerticalStack>
										</Box>
									</VerticalStack>
								</Box>
							</Card>
						</Layout.Section>
					)}

					{/* Recent Activity */}
					{recentActivity.length > 0 && (
						<Layout.Section>
							<Card>
								<Box padding="400">
									<VerticalStack gap="4">
										<HorizontalStack gap="3" blockAlign="center">
											<div
												style={{
													backgroundColor: '#0070F3',
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
												<Icon source={ClipboardMinor} tone="base" />
											</div>
											<VerticalStack gap="1">
												<Text variant="headingMd" as="h3" fontWeight="semibold">
													Recent Activity
												</Text>
												<Text variant="bodyMd" color="subdued" as="p">
													Latest updates from your discount stacks
												</Text>
											</VerticalStack>
										</HorizontalStack>

										<ResourceList
											resourceName={{
												singular: 'activity',
												plural: 'activities',
											}}
											items={recentActivity}
											renderItem={renderActivityItem}
										/>
									</VerticalStack>
								</Box>
							</Card>
						</Layout.Section>
					)}
				</Layout>
			</Page>
		</AppLayout>
	);
}

export default Dashboard;
