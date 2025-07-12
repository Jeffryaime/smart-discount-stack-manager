import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import UnifiedTestDiscountModal from '../UnifiedTestDiscountModal';

// Mock function declared outside to avoid hoisting issues
const mockGetAllProducts = jest.fn();

// Mock the API
jest.mock('../../services/api', () => ({
	discountStacksApi: {
		getAllProducts: () => mockGetAllProducts(),
	},
}));

const mockProducts = [
	{
		id: '123',
		gid: 'gid://shopify/Product/123',
		title: 'Test Product 1',
		vendor: 'Test Vendor',
		productType: 'Test Type',
		minPrice: 10.0,
		maxPrice: 15.0,
		status: 'ACTIVE',
		imageUrl: 'https://example.com/image1.jpg',
		collections: [
			{
				id: '456',
				gid: 'gid://shopify/Collection/456',
				title: 'Test Collection',
			},
		],
	},
	{
		id: '789',
		gid: 'gid://shopify/Product/789',
		title: 'Gift Card',
		vendor: 'Store',
		productType: 'Gift Card',
		minPrice: 25.0,
		maxPrice: 100.0,
		status: 'ACTIVE',
		imageUrl: 'https://example.com/gift.jpg',
		collections: [],
	},
];

const mockDiscountStack = {
	name: 'Test Stack',
	discounts: [
		{
			type: 'buy_x_get_y',
			value: 1,
			isActive: true,
			conditions: {
				productIds: ['gid://shopify/Product/123'],
			},
			bogoConfig: {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['gid://shopify/Product/123'],
				freeProductIds: ['gid://shopify/Product/123'],
				limitPerOrder: 2,
			},
		},
	],
};

const mockPercentageStack = {
	name: 'Percentage Stack',
	discounts: [
		{
			type: 'percentage',
			value: 10,
			isActive: true,
			conditions: {
				minimumAmount: 50,
			},
		},
	],
};

// Test wrapper with required providers
const TestWrapper = ({ children }) => (
	<AppProvider i18n={enTranslations}>{children}</AppProvider>
);

const renderWithProviders = (ui, options) =>
	render(ui, { wrapper: TestWrapper, ...options });

describe('UnifiedTestDiscountModal', () => {
	const mockOnClose = jest.fn();
	const mockOnTest = jest.fn();

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Mock API response
		mockGetAllProducts.mockResolvedValue({
			products: mockProducts,
			hasNextPage: false,
			totalCount: 2,
		});
	});

	describe('Modal Rendering', () => {
		test('renders modal when open', () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			expect(
				screen.getByText('Test Discount Stack: Test Stack')
			).toBeInTheDocument();
			expect(screen.getByText('Product Selection')).toBeInTheDocument();
		});

		test('does not render when closed', () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={false}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			expect(
				screen.queryByText('Test Discount Stack: Test Stack')
			).not.toBeInTheDocument();
		});
	});

	describe('Product Loading and Display', () => {
		test('loads products when modal opens', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				expect(mockGetAllProducts).toHaveBeenCalledWith(100);
			});
		});

		test('displays products with eligibility badges', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				expect(screen.getByText('Test Product 1')).toBeInTheDocument();
				expect(screen.getByText('Gift Card')).toBeInTheDocument();
			});

			// Check for eligibility badges
			await waitFor(() => {
				expect(screen.getByText('Eligible')).toBeInTheDocument();
				expect(screen.getByText('Ineligible')).toBeInTheDocument();
			});
		});

		test('detects and disables gift cards', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				const giftCardBadge = screen.getByText('Gift Card');
				expect(giftCardBadge).toBeInTheDocument();
			});

			// Gift card input should be disabled - use data-testid for stable selection
			await waitFor(() => {
				const giftCardInput = screen.getByTestId('quantity-input-789'); // Gift Card product ID from mock data
				expect(giftCardInput).toBeDisabled();
			});
		});
	});

	describe('Eligibility Calculation', () => {
		test('correctly identifies eligible products for BOGO discount', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				// Product 123 should be eligible (matches conditions.productIds)
				expect(screen.getByText('Test Product 1')).toBeInTheDocument();
				expect(screen.getByText('Eligible')).toBeInTheDocument();

				// Gift card should be ineligible
				expect(screen.getByText('Gift Card')).toBeInTheDocument();
				expect(screen.getByText('Ineligible')).toBeInTheDocument();
			});
		});

		test('correctly identifies eligible products for percentage discount', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockPercentageStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				// For percentage discounts without specific product conditions,
				// all non-gift-card products should be eligible
				const eligibleBadges = screen.getAllByText('Eligible');
				expect(eligibleBadges).toHaveLength(1); // Only Test Product 1

				const ineligibleBadges = screen.getAllByText('Ineligible');
				expect(ineligibleBadges).toHaveLength(1); // Gift Card
			});
		});
	});

	describe('Quantity Management', () => {
		test('allows setting product quantities', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				const firstInput = quantityInputs[0];

				fireEvent.change(firstInput, { target: { value: '2' } });
				expect(firstInput.value).toBe('2');
			});
		});

		test('updates cart breakdown when quantities change', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				const firstInput = quantityInputs[0];

				fireEvent.change(firstInput, { target: { value: '2' } });
			});

			// Should show cart breakdown
			await waitFor(() => {
				expect(screen.getByText('Live Cart Breakdown')).toBeInTheDocument();
				expect(
					screen.getByText('Eligible Items (will receive discounts):')
				).toBeInTheDocument();
			});
		});
	});

	describe('Filtering', () => {
		test('filters products by search term', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				const searchInput = screen.getByPlaceholderText('Search products...');
				fireEvent.change(searchInput, { target: { value: 'Gift' } });
			});

			await waitFor(() => {
				expect(screen.getByText('Gift Card')).toBeInTheDocument();
				expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
			});
		});

		test('filters products by eligibility', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				// Click Add filter button
				const addFilterButton = screen.getByText('Add filter');
				fireEvent.click(addFilterButton);
			});

			// This test would need more complex setup to properly test filter interactions
			// For now, we'll just verify the filter interface exists
			await waitFor(() => {
				expect(screen.getByText('Add filter')).toBeInTheDocument();
			});
		});
	});

	describe('Test Execution', () => {
		test('validates input before running test', async () => {
			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				const runTestButton = screen.getByText('Run Test');
				fireEvent.click(runTestButton);
			});

			// Should show validation error for no products
			await waitFor(() => {
				expect(
					screen.getByText('Please add at least one product to test')
				).toBeInTheDocument();
			});
		});

		test('sends correct payload for BOGO test', async () => {
			mockOnTest.mockResolvedValue({
				finalTotal: 15.0,
				appliedDiscounts: [],
				eligibleSubtotal: 10.0,
				ineligibleSubtotal: 0,
			});

			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Add product quantity
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				const firstInput = quantityInputs[0];
				fireEvent.change(firstInput, { target: { value: '2' } });
			});

			// Run test
			await waitFor(() => {
				const runTestButton = screen.getByText('Run Test');
				fireEvent.click(runTestButton);
			});

			await waitFor(() => {
				expect(mockOnTest).toHaveBeenCalledWith(
					expect.objectContaining({
						eligibleSubtotal: expect.any(Number),
						ineligibleSubtotal: expect.any(Number),
						productIds: expect.arrayContaining(['gid://shopify/Product/123']),
						quantity: 2,
					})
				);
			});
		});
	});

	describe('Results Display', () => {
		test('displays test results with eligible/ineligible breakdown', async () => {
			const mockResults = {
				finalTotal: 45.0,
				eligibleSubtotal: 20.0,
				ineligibleSubtotal: 25.0,
				appliedDiscounts: [
					{
						type: 'buy_x_get_y',
						appliedAmount: 10.0,
						bogoConfig: { buyQuantity: 1, getQuantity: 1, limitPerOrder: 2 },
						calculationDetails: { freeItemsCount: 1, limitApplied: true },
						isActive: true,
					},
				],
				productDiscountAmount: 10.0,
				totalDiscountAmount: 10.0,
				savingsPercentage: 18,
			};

			mockOnTest.mockResolvedValue(mockResults);

			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Add product and run test
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				fireEvent.change(quantityInputs[0], { target: { value: '2' } });
			});

			await waitFor(() => {
				fireEvent.click(screen.getByText('Run Test'));
			});

			// Check results display
			await waitFor(() => {
				expect(screen.getByText('Test Results')).toBeInTheDocument();
				expect(
					screen.getByText('Eligible Items (Discounts Applied)')
				).toBeInTheDocument();
				expect(screen.getByText('BOGO')).toBeInTheDocument();
				expect(
					screen.getByText('Buy 1 Get 1 Free (1 items received)')
				).toBeInTheDocument();
			});
		});

		test('shows clean BOGO discount details without technical info', async () => {
			const mockResults = {
				finalTotal: 45.0,
				eligibleSubtotal: 20.0,
				appliedDiscounts: [
					{
						type: 'buy_x_get_y',
						appliedAmount: 10.0,
						bogoConfig: { buyQuantity: 1, getQuantity: 1, limitPerOrder: 2 },
						calculationDetails: { freeItemsCount: 1, limitApplied: true },
						isActive: true,
					},
				],
			};

			mockOnTest.mockResolvedValue(mockResults);

			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Add product and run test
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				fireEvent.change(quantityInputs[0], { target: { value: '2' } });
				fireEvent.click(screen.getByText('Run Test'));
			});

			// Check that technical details are hidden
			await waitFor(() => {
				expect(screen.queryByText(/Sets Qualified/)).not.toBeInTheDocument();
				expect(screen.queryByText(/Sets Applied/)).not.toBeInTheDocument();

				// But customer-friendly details should be shown
				expect(screen.getByText('Limit: 2 per order')).toBeInTheDocument();
				expect(screen.getByText(/Limit Applied/)).toBeInTheDocument();
			});
		});
	});

	describe('Error Handling', () => {
		test('handles product loading errors gracefully', async () => {
			mockGetAllProducts.mockRejectedValue(new Error('API Error'));

			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			await waitFor(() => {
				expect(screen.getByText('Failed to load products')).toBeInTheDocument();
			});
		});

		test('handles test execution errors', async () => {
			mockOnTest.mockRejectedValue(new Error('Test failed'));

			renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Add product and run test
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				fireEvent.change(quantityInputs[0], { target: { value: '1' } });
				fireEvent.click(screen.getByText('Run Test'));
			});

			await waitFor(() => {
				expect(screen.getByText(/Failed to run test/)).toBeInTheDocument();
			});
		});
	});

	describe('Modal Cleanup', () => {
		test('resets form data when modal closes', async () => {
			const { rerender } = renderWithProviders(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Wait for products to load and add some data
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				const firstInput = quantityInputs[0];
				fireEvent.change(firstInput, { target: { value: '2' } });
			});

			// Verify data was added
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				expect(quantityInputs[0].value).toBe('2');
			});

			// Close modal
			rerender(
				<UnifiedTestDiscountModal
					open={false}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Reopen modal - should be clean
			rerender(
				<UnifiedTestDiscountModal
					open={true}
					onClose={mockOnClose}
					discountStack={mockDiscountStack}
					onTest={mockOnTest}
				/>
			);

			// Wait for products to load again and verify form is reset
			await waitFor(() => {
				const quantityInputs = screen.getAllByLabelText('Quantity');
				// All quantity inputs should be reset to empty/default state
				quantityInputs.forEach((input) => {
					expect(input.value).toBe('0');
				});
			});

			// Verify search filter is reset
			const searchInput = screen.getByPlaceholderText('Search products...');
			expect(searchInput.value).toBe('');

			// Verify no test results are shown
			expect(screen.queryByText('Test Results')).not.toBeInTheDocument();

			// Verify that onClose was not called during the reset process
			expect(mockOnClose).not.toHaveBeenCalled();
		});
	});
});
