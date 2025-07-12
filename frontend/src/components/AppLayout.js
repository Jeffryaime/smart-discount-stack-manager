import React, { useState } from 'react';
import {
	Frame,
	Navigation,
	TopBar,
	Text,
	Box,
	HorizontalStack,
} from '@shopify/polaris';
import {
	HomeMajor,
	ProductsMajor,
	PlusMinor,
	SettingsMajor,
} from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigateWithShop, getCurrentShop } from '../utils/navigation';

const AppLayout = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);

	const toggleMobileNavigationActive = () =>
		setMobileNavigationActive(!mobileNavigationActive);

	const toggleUserMenuOpen = () => setUserMenuOpen(!userMenuOpen);

	// Get current path for navigation highlighting
	const currentPath = location.pathname;

	const handleNavigation = (path) => {
		navigateWithShop(navigate, path);
	};

	const navigationMarkup = (
		<Navigation location={currentPath}>
			<Navigation.Section
				items={[
					{
						url: '#',
						excludePaths: ['#'],
						label: 'Dashboard',
						icon: HomeMajor,
						selected: currentPath === '/' || currentPath === '/dashboard',
						onClick: () => handleNavigation('/dashboard'),
					},
					{
						url: '#',
						excludePaths: ['#'],
						label: 'Discount Stacks',
						icon: ProductsMajor,
						selected:
							currentPath.startsWith('/discount-stacks') &&
							!currentPath.includes('/new') &&
							!currentPath.includes('/create'),
						onClick: () => handleNavigation('/discount-stacks'),
					},
					{
						url: '#',
						excludePaths: ['#'],
						label: 'Create Stack',
						icon: PlusMinor,
						selected:
							currentPath.includes('/new') ||
							currentPath.includes('/create') ||
							currentPath === '/discount-stacks/create',
						onClick: () => handleNavigation('/discount-stacks/create'),
					},
					{
						url: '#',
						excludePaths: ['#'],
						label: 'Settings',
						icon: SettingsMajor,
						selected: currentPath === '/settings',
						onClick: () => handleNavigation('/settings'),
					},
				]}
			/>
		</Navigation>
	);

	const userMenuActions = [
		{
			items: [{ content: 'Community forums' }],
		},
	];

	// Get current shop name dynamically
	const currentShop = getCurrentShop() || 'jaynorthcode.myshopify.com';

	const topBarMarkup = (
		<div style={{ position: 'relative' }}>
			<TopBar
				showNavigationToggle
				userMenu={
					<TopBar.UserMenu
						actions={userMenuActions}
						name="Merchant"
						detail={currentShop}
						initials="M"
						open={userMenuOpen}
						onToggle={toggleUserMenuOpen}
					/>
				}
				onNavigationToggle={toggleMobileNavigationActive}
			/>
			<div style={{
				position: 'absolute',
				left: '60px',
				top: '50%',
				transform: 'translateY(-50%)',
				zIndex: 10,
				pointerEvents: 'none'
			}}>
				<Text 
					variant="headingLg" 
					as="span" 
					fontWeight="bold"
					style={{
						color: '#202223',
						fontSize: '20px',
						textDecoration: 'none',
						fontWeight: '700'
					}}
				>
					Smart Discount Stack Manager
				</Text>
			</div>
		</div>
	);

	return (
		<Frame
			topBar={topBarMarkup}
			navigation={navigationMarkup}
			showMobileNavigation={mobileNavigationActive}
			onNavigationDismiss={toggleMobileNavigationActive}
			skipToContentTarget="main-content"
		>
			<div id="main-content">{children}</div>
		</Frame>
	);
};

export default AppLayout;
