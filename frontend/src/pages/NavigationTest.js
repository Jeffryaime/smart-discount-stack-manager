import React, { useState } from 'react';
import {
	Frame,
	Navigation,
	TopBar,
	Page,
	Layout,
	Card,
	Text,
	VerticalStack,
	Icon,
	Box,
} from '@shopify/polaris';
import {
	HomeMajor,
	ProductsMajor,
	PlusMinor,
	SettingsMajor,
} from '@shopify/polaris-icons';

const NavigationTest = () => {
	const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState('dashboard');

	const toggleMobileNavigationActive = () =>
		setMobileNavigationActive(!mobileNavigationActive);

	const toggleUserMenuOpen = () =>
		setUserMenuOpen(!userMenuOpen);

	// Test navigation items with icons
	const navigationItems = [
		{
			id: 'dashboard',
			url: '#',
			label: 'Dashboard',
			icon: HomeMajor,
			selected: currentPage === 'dashboard',
			onClick: () => setCurrentPage('dashboard'),
		},
		{
			id: 'discount-stacks',
			url: '#',
			label: 'Discount Stacks',
			icon: ProductsMajor,
			selected: currentPage === 'discount-stacks',
			onClick: () => setCurrentPage('discount-stacks'),
		},
		{
			id: 'create-stack',
			url: '#',
			label: 'Create Stack',
			icon: PlusMinor,
			selected: currentPage === 'create-stack',
			onClick: () => setCurrentPage('create-stack'),
		},
		{
			id: 'settings',
			url: '#',
			label: 'Settings',
			icon: SettingsMajor,
			selected: currentPage === 'settings',
			onClick: () => setCurrentPage('settings'),
		},
	];

	const navigationMarkup = (
		<Navigation location="/">
			<Navigation.Section
				title="Smart Discount Stack Manager"
				items={navigationItems}
			/>
		</Navigation>
	);

	const topBarMarkup = (
		<TopBar
			showNavigationToggle
			userMenu={
				<TopBar.UserMenu
					actions={[
						{
							items: [{ content: 'Community forums' }],
						},
					]}
					name="Merchant"
					detail="jaynorthcode.myshopify.com"
					initials="M"
					open={userMenuOpen}
					onToggle={toggleUserMenuOpen}
				/>
			}
			onNavigationToggle={toggleMobileNavigationActive}
		/>
	);

	const pageContent = (
		<Page title="Navigation Test">
			<Layout>
				<Layout.Section>
					<Card>
						<Box padding="400">
							<VerticalStack gap="4">
								<Text variant="headingMd" as="h2">
									Navigation Component Test
								</Text>
								<Text variant="bodyMd" as="p">
									Current page: <strong>{currentPage}</strong>
								</Text>
								<Text variant="bodyMd" as="p">
									Testing Polaris Frame, Navigation, and TopBar components.
								</Text>
								
								<VerticalStack gap="2">
									<Text variant="headingSm" as="h3">Icons Test:</Text>
									{navigationItems.map((item) => (
										<div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
											<Icon source={item.icon} tone="base" />
											<Text variant="bodyMd">{item.label}</Text>
										</div>
									))}
								</VerticalStack>
							</VerticalStack>
						</Box>
					</Card>
				</Layout.Section>
			</Layout>
		</Page>
	);

	return (
		<Frame
			topBar={topBarMarkup}
			navigation={navigationMarkup}
			showMobileNavigation={mobileNavigationActive}
			onNavigationDismiss={toggleMobileNavigationActive}
		>
			{pageContent}
		</Frame>
	);
};

export default NavigationTest;