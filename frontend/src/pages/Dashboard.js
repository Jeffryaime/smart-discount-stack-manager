import React from 'react';
import {
	Page,
	Layout,
	Card,
	Text,
	Button,
	HorizontalStack,
	VerticalStack,
	Badge,
	DataTable,
	Icon,
} from '@shopify/polaris';
import {
	EditMajor,
} from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useDiscountStacks } from '../hooks/useDiscountStacks';

function Dashboard() {
	const navigate = useNavigate();
	const { data: discountStacks, isLoading, error } = useDiscountStacks();

	const rows =
		discountStacks?.slice(0, 5).map((stack) => [
			stack.name,
			stack.isActive ? (
				<Badge status="success">Active</Badge>
			) : (
				<Badge>Inactive</Badge>
			),
			stack.discounts?.length || 0,
			stack.usageCount || 0,
			<Button
				plain
				onClick={() => navigate(`/discount-stacks/${stack._id}/edit`)}
				accessibilityLabel="Edit discount stack"
				icon={<Icon source={EditMajor} />}
			/>,
		]) || [];

	return (
		<Page
			title="Smart Discount Stack Manager"
			primaryAction={{
				content: 'Create Discount Stack',
				onAction: () => {
					if (process.env.NODE_ENV === 'development') {
						console.log('Primary action clicked');
					}
					navigate('/discount-stacks/create');
				},
			}}
		>
			<Layout>
				<Layout.Section>
					<Card>
						<div style={{ padding: '20px' }}>
							<VerticalStack gap="5">
								<Text variant="headingLg">
									Welcome to Smart Discount Stack Manager
								</Text>
								<Text>
									Create and manage complex discount combinations for your
									Shopify store. Stack multiple discounts, set conditions, and
									track performance.
								</Text>
								<HorizontalStack>
									<Button
										primary
										onClick={() => {
											console.log('Navigate to create discount stack');
											console.log(
												'Current location:',
												window.location.pathname
											);
											try {
												navigate('/discount-stacks/create');
												console.log('Navigation called successfully');
											} catch (error) {
												console.error('Navigation error:', error);
											}
										}}
									>
										Create Your First Stack
									</Button>
									<Button
										onClick={() => {
											console.log('Navigate to view all stacks');
											console.log(
												'Current location:',
												window.location.pathname
											);
											try {
												navigate('/discount-stacks');
												console.log('Navigation called successfully');
											} catch (error) {
												console.error('Navigation error:', error);
											}
										}}
									>
										View All Stacks
									</Button>
								</HorizontalStack>
							</VerticalStack>
						</div>
					</Card>
				</Layout.Section>

				<Layout.Section>
					<Card>
						<div style={{ padding: '20px' }}>
							<VerticalStack gap="5">
								<Text variant="headingLg">Recent Discount Stacks</Text>
								{isLoading ? (
									<Text>Loading...</Text>
								) : error ? (
									<Text>
										Unable to load discount stacks. Please check your
										connection.
									</Text>
								) : rows.length > 0 ? (
									<DataTable
										columnContentTypes={[
											'text',
											'text',
											'numeric',
											'numeric',
											'text',
										]}
										headings={[
											'Name',
											'Status',
											'Discounts',
											'Usage',
											'Actions',
										]}
										rows={rows}
									/>
								) : (
									<Text>No discount stacks created yet.</Text>
								)}
							</VerticalStack>
						</div>
					</Card>
				</Layout.Section>
			</Layout>
		</Page>
	);
}

export default Dashboard;
