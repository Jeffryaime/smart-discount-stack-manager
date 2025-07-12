// Test dashboard to verify icons work before building real one
import React from 'react';
import {
	Page,
	Layout, 
	Card,
	Text,
	HorizontalStack,
	VerticalStack,
	Icon,
	Box,
} from '@shopify/polaris';

// Test importing icons that might work for our dashboard
import {
	// For Active Stacks - try stack/layer icons
	ProductsMajor,
	CollectionsMajor,
	
	// For Total Savings - money/dollar icons
	CashDollarMajor,
	
	// For Orders - shopping/cart icons  
	OrdersMajor,
	
	// Analytics icon
	AnalyticsMajor,
} from '@shopify/polaris-icons';

const DashboardTest = () => {
	const testIcons = [
		{ name: 'ProductsMajor', icon: ProductsMajor, color: '#00A047' },
		{ name: 'CollectionsMajor', icon: CollectionsMajor, color: '#00A047' },
		{ name: 'CashDollarMajor', icon: CashDollarMajor, color: '#00A047' },
		{ name: 'OrdersMajor', icon: OrdersMajor, color: '#0070F3' },
		{ name: 'AnalyticsMajor', icon: AnalyticsMajor, color: '#0070F3' },
	];

	return (
		<Page title="Icon Test">
			<Layout>
				<Layout.Section>
					<Card>
						<Box padding="400">
							<VerticalStack gap="4">
								<Text variant="headingMd" as="h2">Testing Available Icons</Text>
								{testIcons.map(({ name, icon, color }) => (
									<HorizontalStack key={name} align="space-between" blockAlign="center">
										<Text variant="bodyMd">{name}</Text>
										<div
											style={{
												backgroundColor: color,
												borderRadius: '8px',
												padding: '8px',
												color: 'white',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center'
											}}
										>
											<Icon source={icon} tone="base" />
										</div>
									</HorizontalStack>
								))}
							</VerticalStack>
						</Box>
					</Card>
				</Layout.Section>
			</Layout>
		</Page>
	);
};

export default DashboardTest;