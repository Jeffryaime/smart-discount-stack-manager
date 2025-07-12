import React, { useState, useEffect } from 'react';
import {
	Modal,
	Card,
	TextField,
	Button,
	Badge,
	Box,
	Text,
	Divider,
	InlineError,
	SkeletonBodyText,
	Banner,
	VerticalStack,
	HorizontalStack,
	Thumbnail,
	ButtonGroup,
	Filters,
	ChoiceList,
	EmptyState,
	Spinner,
} from '@shopify/polaris';
import { discountStacksApi } from '../services/api';
import UnifiedProductSelector from './UnifiedProductSelector';

const EnhancedTestDiscountModal = ({
	open,
	onClose,
	discountStack,
	onTest,
}) => {
	// Determine if this stack has BOGO discounts
	const hasBogoDiscounts =
		discountStack?.discounts?.some(
			(discount) => discount.type === 'buy_x_get_y'
		) || false;

	// Test data state - different structure based on stack type
	const [testData, setTestData] = useState({
		// Simple mode (non-BOGO)
		cartSubtotal: '',
		customerSegment: '',
		shippingCost: '',
		taxRate: '',
		// Advanced mode (BOGO)
		products: [], // Array of { id, quantity, price, name, image, status }
	});

	// Product selection and filtering (only for BOGO)
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [searchFilter, setSearchFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState([]);
	const [vendorFilter, setVendorFilter] = useState([]);
	const [priceRangeFilter, setPriceRangeFilter] = useState('');

	// Modal state
	const [results, setResults] = useState(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});
	const [currentTab, setCurrentTab] = useState(
		hasBogoDiscounts ? 'products' : 'simple'
	); // 'simple', 'products' or 'results'

	// Load products when modal opens (only for BOGO stacks)
	useEffect(() => {
		if (open && hasBogoDiscounts) {
			loadProducts();
		}
	}, [open, hasBogoDiscounts]);

	// Apply filters to products
	useEffect(() => {
		let filtered = [...allProducts];

		// Search filter
		if (searchFilter.trim()) {
			const search = searchFilter.toLowerCase();
			filtered = filtered.filter(
				(product) =>
					product.title.toLowerCase().includes(search) ||
					product.vendor?.toLowerCase().includes(search)
			);
		}

		// Status filter
		if (statusFilter.length > 0) {
			filtered = filtered.filter((product) =>
				statusFilter.includes(product.status)
			);
		}

		// Vendor filter
		if (vendorFilter.length > 0) {
			filtered = filtered.filter((product) =>
				vendorFilter.includes(product.vendor)
			);
		}

		// Price range filter
		if (priceRangeFilter) {
			filtered = filtered.filter((product) => {
				const price = product.minPrice;
				switch (priceRangeFilter) {
					case 'under_25':
						return price < 25;
					case '25_to_50':
						return price >= 25 && price < 50;
					case '50_to_100':
						return price >= 50 && price < 100;
					case 'over_100':
						return price >= 100;
					default:
						return true;
				}
			});
		}

		setFilteredProducts(filtered);
	}, [allProducts, searchFilter, statusFilter, vendorFilter, priceRangeFilter]);

	const loadProducts = async () => {
		setLoadingProducts(true);
		try {
			// Use a configurable limit - can be adjusted based on store size
			const PRODUCT_LIMIT = 250; // Increased from 100 to handle larger catalogs
			const response = await discountStacksApi.getAllProducts(PRODUCT_LIMIT);
			setAllProducts(response.products || []);
		} catch (error) {
			console.error('Error loading products:', error);
			setErrors({ products: 'Failed to load products' });
		} finally {
			setLoadingProducts(false);
		}
	};

	const handleInputChange = (field) => (value) => {
		setTestData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: null }));
		}
	};

	const handleProductQuantityChange = (productId, quantity) => {
		const qty = Math.max(0, parseInt(quantity) || 0);

		setTestData((prev) => {
			const existingProducts = prev.products.filter((p) => p.id !== productId);

			if (qty > 0) {
				const product = allProducts.find((p) => p.id === productId);
				if (product) {
					return {
						...prev,
						products: [
							...existingProducts,
							{
								id: productId,
								gid: product.gid,
								quantity: qty,
								price: product.minPrice,
								name: product.title,
								image: product.imageUrl,
								status: product.status,
								vendor: product.vendor,
							},
						],
					};
				}
			}

			return { ...prev, products: existingProducts };
		});
	};

	const getProductQuantity = (productId) => {
		const product = testData.products.find((p) => p.id === productId);
		return product ? product.quantity : 0;
	};

	const calculateSubtotal = () => {
		return testData.products.reduce((total, product) => {
			return total + product.price * product.quantity;
		}, 0);
	};

	const calculateShipping = () => {
		return parseFloat(testData.shippingCost) || 0;
	};

	const calculateTax = () => {
		const taxRate = parseFloat(testData.taxRate) || 0;
		const subtotal = calculateSubtotal();
		const shipping = calculateShipping();
		return (subtotal + shipping) * (taxRate / 100);
	};

	const calculateTotal = () => {
		return calculateSubtotal() + calculateShipping() + calculateTax();
	};

	// Helper functions for simple mode calculations
	const calculateSimpleSubtotal = () => {
		return parseFloat(testData.cartSubtotal) || 0;
	};

	const calculateSimpleTax = () => {
		const taxRate = parseFloat(testData.taxRate) / 100 || 0;
		const subtotal = calculateSimpleSubtotal();
		const shipping = calculateShipping();
		return (subtotal + shipping) * taxRate;
	};

	const calculateSimpleTotal = () => {
		return (
			calculateSimpleSubtotal() + calculateShipping() + calculateSimpleTax()
		);
	};

	const validateInputs = () => {
		const newErrors = {};

		if (hasBogoDiscounts) {
			// Advanced mode validation (BOGO)
			if (testData.products.length === 0) {
				newErrors.products = 'Please add at least one product to test';
			}
		} else {
			// Simple mode validation (non-BOGO)
			const subtotalValue = parseFloat(testData.cartSubtotal);
			if (
				!testData.cartSubtotal ||
				isNaN(subtotalValue) ||
				subtotalValue <= 0
			) {
				newErrors.cartSubtotal = 'Cart subtotal must be greater than 0';
			}
		}

		// Common validations
		if (
			testData.taxRate &&
			(parseFloat(testData.taxRate) < 0 || parseFloat(testData.taxRate) > 100)
		) {
			newErrors.taxRate = 'Tax rate must be between 0 and 100';
		}

		if (testData.shippingCost && parseFloat(testData.shippingCost) < 0) {
			newErrors.shippingCost = 'Shipping cost cannot be negative';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleTest = async () => {
		if (!validateInputs()) {
			if (hasBogoDiscounts) {
				setCurrentTab('products');
			} else {
				setCurrentTab('simple');
			}
			return;
		}

		setLoading(true);
		setCurrentTab('results');

		try {
			let testPayload;

			if (hasBogoDiscounts) {
				// Advanced mode (BOGO) - use detailed cart items
				const cartItems = testData.products.map((product) => ({
					productId: product.gid,
					quantity: product.quantity,
					price: product.price,
					title: product.name,
				}));

				testPayload = {
					cartItems,
					originalPrice: calculateSubtotal(),
					productIds: testData.products.map((p) => p.gid),
					customerSegment: testData.customerSegment,
					shippingCost: calculateShipping(),
					taxRate: parseFloat(testData.taxRate) / 100 || 0,
					cartTotal: calculateTotal(),
				};
			} else {
				// Simple mode (non-BOGO) - use cart subtotal
				const subtotal = parseFloat(testData.cartSubtotal);
				const shipping = parseFloat(testData.shippingCost) || 0;
				const taxRate = parseFloat(testData.taxRate) / 100 || 0;
				const tax = (subtotal + shipping) * taxRate;

				testPayload = {
					originalPrice: subtotal,
					customerSegment: testData.customerSegment,
					shippingCost: shipping,
					taxRate: taxRate,
					cartTotal: subtotal + shipping + tax,
					productIds: [], // No specific products for non-BOGO
					cartItems: [], // No specific items for non-BOGO
				};
			}

			const result = await onTest(testPayload);
			setResults(result);
		} catch (error) {
			console.error('Test failed:', error);
			const errorMessage =
				error.response?.data?.error ||
				error.message ||
				'Failed to run test. Please try again.';
			setErrors({ general: errorMessage });
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setTestData({
			cartSubtotal: '',
			customerSegment: '',
			shippingCost: '',
			taxRate: '',
			products: [],
		});
		setResults(null);
		setErrors({});
		setCurrentTab(hasBogoDiscounts ? 'products' : 'simple');

		// Reset filters (only matters for BOGO mode)
		setSearchFilter('');
		setStatusFilter([]);
		setVendorFilter([]);
		setPriceRangeFilter('');

		onClose();
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	// Get filter options
	const getFilterOptions = () => {
		const vendors = [
			...new Set(allProducts.map((p) => p.vendor).filter(Boolean)),
		];

		return {
			statusOptions: [
				{ label: 'Active', value: 'ACTIVE' },
				{ label: 'Draft', value: 'DRAFT' },
				{ label: 'Archived', value: 'ARCHIVED' },
			],
			vendorOptions: vendors.map((vendor) => ({
				label: vendor,
				value: vendor,
			})),
			priceRangeOptions: [
				{ label: 'Under $25', value: 'under_25' },
				{ label: '$25 - $50', value: '25_to_50' },
				{ label: '$50 - $100', value: '50_to_100' },
				{ label: 'Over $100', value: 'over_100' },
			],
		};
	};

	const filterOptions = getFilterOptions();

	const appliedFilters = [];
	if (statusFilter.length > 0) {
		appliedFilters.push({
			key: 'status',
			label: `Status: ${statusFilter.join(', ')}`,
			onRemove: () => setStatusFilter([]),
		});
	}
	if (vendorFilter.length > 0) {
		appliedFilters.push({
			key: 'vendor',
			label: `Vendor: ${vendorFilter.join(', ')}`,
			onRemove: () => setVendorFilter([]),
		});
	}
	if (priceRangeFilter) {
		const priceLabel = filterOptions.priceRangeOptions.find(
			(o) => o.value === priceRangeFilter
		)?.label;
		appliedFilters.push({
			key: 'price',
			label: `Price: ${priceLabel}`,
			onRemove: () => setPriceRangeFilter(''),
		});
	}

	const clearAllFilters = () => {
		setSearchFilter('');
		setStatusFilter([]);
		setVendorFilter([]);
		setPriceRangeFilter('');
	};

	return (
		<Modal
			open={open}
			onClose={handleClose}
			title={`Test Discount Stack: ${discountStack?.name || ''}`}
			primaryAction={{
				content:
					currentTab === 'products' || currentTab === 'simple'
						? 'Run Test'
						: 'Run New Test',
				onAction:
					currentTab === 'products' || currentTab === 'simple'
						? handleTest
						: () => setCurrentTab(hasBogoDiscounts ? 'products' : 'simple'),
				loading: loading,
				disabled:
					loading ||
					(hasBogoDiscounts &&
						currentTab === 'products' &&
						testData.products.length === 0) ||
					(!hasBogoDiscounts &&
						currentTab === 'simple' &&
						(() => {
							const subtotalValue = parseFloat(testData.cartSubtotal);
							return (
								!testData.cartSubtotal ||
								isNaN(subtotalValue) ||
								subtotalValue <= 0
							);
						})()),
			}}
			secondaryActions={[
				{
					content: 'Close',
					onAction: handleClose,
				},
			]}
			large
		>
			<Modal.Section>
				<VerticalStack gap="5">
					{errors.general && (
						<Banner
							status="critical"
							onDismiss={() => setErrors({ ...errors, general: null })}
						>
							{errors.general}
						</Banner>
					)}

					{/* Tab Navigation */}
					<ButtonGroup segmented>
						<Button
							pressed={
								currentTab === (hasBogoDiscounts ? 'products' : 'simple')
							}
							onClick={() =>
								setCurrentTab(hasBogoDiscounts ? 'products' : 'simple')
							}
						>
							{hasBogoDiscounts
								? `Cart Setup (${testData.products.length} items)`
								: 'Cart Setup'}
						</Button>
						<Button
							pressed={currentTab === 'results'}
							onClick={() => setCurrentTab('results')}
							disabled={!results && !loading}
						>
							Test Results
						</Button>
					</ButtonGroup>

					{/* Simple Mode for Non-BOGO Stacks */}
					{currentTab === 'simple' && !hasBogoDiscounts && (
						<Card>
							<VerticalStack gap="4">
								<Text variant="headingMd" as="h3">
									Cart Details
								</Text>

								<TextField
									label="Cart Subtotal"
									type="number"
									value={testData.cartSubtotal}
									onChange={handleInputChange('cartSubtotal')}
									prefix="$"
									placeholder="100.00"
									helpText="Enter the total cart value to test"
									error={errors.cartSubtotal}
									autoComplete="off"
								/>

								<TextField
									label="Customer Segment"
									value={testData.customerSegment}
									onChange={handleInputChange('customerSegment')}
									placeholder="VIP"
									helpText="Customer segment for testing (optional)"
									autoComplete="off"
								/>

								<TextField
									label="Shipping Cost"
									type="number"
									value={testData.shippingCost}
									onChange={handleInputChange('shippingCost')}
									prefix="$"
									placeholder="10.00"
									helpText="Shipping cost to add to the order"
									error={errors.shippingCost}
									autoComplete="off"
								/>

								<TextField
									label="Tax Rate"
									type="number"
									value={testData.taxRate}
									onChange={handleInputChange('taxRate')}
									suffix="%"
									placeholder="8.25"
									helpText="Tax percentage (e.g., 8.25 for 8.25%)"
									error={errors.taxRate}
									autoComplete="off"
								/>

								{/* Order Total Preview for Simple Mode */}
								{testData.cartSubtotal &&
									parseFloat(testData.cartSubtotal) > 0 && (
										<Box
											padding="3"
											background="bg-surface-secondary"
											borderRadius="200"
										>
											<VerticalStack gap="2">
												<Text variant="headingMd">Order Total Preview</Text>

												<HorizontalStack align="space-between">
													<Text>Subtotal:</Text>
													<Text>
														{formatCurrency(
															parseFloat(testData.cartSubtotal) || 0
														)}
													</Text>
												</HorizontalStack>

												{testData.shippingCost &&
													parseFloat(testData.shippingCost) > 0 && (
														<HorizontalStack align="space-between">
															<Text>Shipping:</Text>
															<Text>
																{formatCurrency(
																	parseFloat(testData.shippingCost) || 0
																)}
															</Text>
														</HorizontalStack>
													)}

												{testData.taxRate &&
													parseFloat(testData.taxRate) > 0 && (
														<HorizontalStack align="space-between">
															<Text>Tax ({testData.taxRate || 0}%):</Text>
															<Text>
																{formatCurrency(calculateSimpleTax())}
															</Text>
														</HorizontalStack>
													)}

												<Divider />

												<HorizontalStack align="space-between">
													<Text variant="headingMd">Total:</Text>
													<Text variant="headingMd">
														{formatCurrency(calculateSimpleTotal())}
													</Text>
												</HorizontalStack>
											</VerticalStack>
										</Box>
									)}
							</VerticalStack>
						</Card>
					)}

					{/* Advanced Mode for BOGO Stacks */}
					{currentTab === 'products' && hasBogoDiscounts && (
						<>
							{/* Product Selection */}
							<Card>
								<VerticalStack gap="4">
									<Text variant="headingMd" as="h3">
										Product Selection
									</Text>

									{/* Filters */}
									{!loadingProducts && (
										<Filters
											queryValue={searchFilter}
											queryPlaceholder="Search products..."
											filters={[
												{
													key: 'status',
													label: 'Status',
													filter: (
														<ChoiceList
															title="Product Status"
															titleHidden
															choices={filterOptions.statusOptions}
															selected={statusFilter}
															onChange={setStatusFilter}
															allowMultiple
														/>
													),
													shortcut: true,
												},
												{
													key: 'vendor',
													label: 'Vendor',
													filter: (
														<ChoiceList
															title="Vendor"
															titleHidden
															choices={filterOptions.vendorOptions}
															selected={vendorFilter}
															onChange={setVendorFilter}
															allowMultiple
														/>
													),
													shortcut: false,
												},
												{
													key: 'price',
													label: 'Price Range',
													filter: (
														<ChoiceList
															title="Price Range"
															titleHidden
															choices={filterOptions.priceRangeOptions}
															selected={
																priceRangeFilter ? [priceRangeFilter] : []
															}
															onChange={(value) =>
																setPriceRangeFilter(value[0] || '')
															}
														/>
													),
													shortcut: false,
												},
											]}
											appliedFilters={appliedFilters}
											onQueryChange={setSearchFilter}
											onQueryClear={() => setSearchFilter('')}
											onClearAll={clearAllFilters}
										/>
									)}

									{loadingProducts ? (
										<Box padding="4">
											<HorizontalStack align="center" gap="2">
												<Spinner size="small" />
												<Text>Loading products...</Text>
											</HorizontalStack>
										</Box>
									) : filteredProducts.length > 0 ? (
										<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
											<VerticalStack gap="0">
												{filteredProducts.map((product, index) => {
													const quantity = getProductQuantity(product.id);
													return (
														<div
															key={product.id}
															style={{
																padding: '12px 16px',
																borderBottom:
																	index < filteredProducts.length - 1
																		? '1px solid #e1e3e5'
																		: 'none',
																backgroundColor:
																	quantity > 0 ? '#f6f6f7' : 'transparent',
															}}
														>
															<HorizontalStack gap="3" align="space-between">
																<HorizontalStack gap="3" align="start">
																	<Thumbnail
																		source={product.imageUrl || ''}
																		alt={product.title}
																		size="small"
																	/>
																	<VerticalStack gap="1">
																		<Text
																			variant="bodyMd"
																			fontWeight="semibold"
																		>
																			{product.title}
																		</Text>
																		<Text variant="bodySm" color="subdued">
																			{product.vendor} • ID: {product.id}
																		</Text>
																		<HorizontalStack gap="2">
																			<Text
																				variant="bodySm"
																				fontWeight="medium"
																			>
																				{formatCurrency(product.minPrice)}
																			</Text>
																			<Badge
																				status={
																					product.status === 'ACTIVE'
																						? 'success'
																						: 'info'
																				}
																			>
																				{product.status}
																			</Badge>
																		</HorizontalStack>
																	</VerticalStack>
																</HorizontalStack>

																<HorizontalStack gap="2" align="end">
																	<div style={{ width: '80px' }}>
																		<TextField
																			type="number"
																			value={quantity.toString()}
																			onChange={(value) =>
																				handleProductQuantityChange(
																					product.id,
																					value
																				)
																			}
																			min={0}
																			placeholder="0"
																			autoComplete="off"
																			labelHidden
																			label="Quantity"
																		/>
																	</div>
																	{quantity > 0 && (
																		<Text variant="bodySm" fontWeight="medium">
																			{formatCurrency(
																				product.minPrice * quantity
																			)}
																		</Text>
																	)}
																</HorizontalStack>
															</HorizontalStack>
														</div>
													);
												})}
											</VerticalStack>
										</div>
									) : (
										<EmptyState
											heading="No products found"
											action={{
												content: 'Clear filters',
												onAction: clearAllFilters,
											}}
										>
											<Text>
												Try adjusting your search or filters to find products.
											</Text>
										</EmptyState>
									)}

									{errors.products && <InlineError message={errors.products} />}
								</VerticalStack>
							</Card>

							{/* Cart Summary */}
							{testData.products.length > 0 && (
								<Card>
									<VerticalStack gap="4">
										<Text variant="headingMd" as="h3">
											Cart Summary
										</Text>

										<VerticalStack gap="2">
											{testData.products.map((product) => (
												<HorizontalStack key={product.id} align="space-between">
													<Text>
														{product.name} × {product.quantity}
													</Text>
													<Text fontWeight="medium">
														{formatCurrency(product.price * product.quantity)}
													</Text>
												</HorizontalStack>
											))}

											<Divider />

											<HorizontalStack align="space-between">
												<Text variant="bodyMd" fontWeight="medium">
													Subtotal:
												</Text>
												<Text variant="bodyMd" fontWeight="medium">
													{formatCurrency(calculateSubtotal())}
												</Text>
											</HorizontalStack>
										</VerticalStack>
									</VerticalStack>
								</Card>
							)}

							{/* Additional Options */}
							<Card>
								<VerticalStack gap="4">
									<Text variant="headingMd" as="h3">
										Additional Options
									</Text>

									<TextField
										label="Customer Segment"
										value={testData.customerSegment}
										onChange={handleInputChange('customerSegment')}
										placeholder="VIP"
										helpText="Customer segment for testing (optional)"
										autoComplete="off"
									/>

									<TextField
										label="Shipping Cost"
										type="number"
										value={testData.shippingCost}
										onChange={handleInputChange('shippingCost')}
										prefix="$"
										placeholder="10.00"
										helpText="Shipping cost to add to the order"
										error={errors.shippingCost}
										autoComplete="off"
									/>

									<TextField
										label="Tax Rate"
										type="number"
										value={testData.taxRate}
										onChange={handleInputChange('taxRate')}
										suffix="%"
										placeholder="8.25"
										helpText="Tax percentage (e.g., 8.25 for 8.25%)"
										error={errors.taxRate}
										autoComplete="off"
									/>

									{/* Order Total Preview */}
									{testData.products.length > 0 && (
										<Box
											padding="3"
											background="bg-surface-secondary"
											borderRadius="200"
										>
											<VerticalStack gap="2">
												<Text variant="headingMd">Order Total Preview</Text>

												<HorizontalStack align="space-between">
													<Text>Subtotal:</Text>
													<Text>{formatCurrency(calculateSubtotal())}</Text>
												</HorizontalStack>

												{calculateShipping() > 0 && (
													<HorizontalStack align="space-between">
														<Text>Shipping:</Text>
														<Text>{formatCurrency(calculateShipping())}</Text>
													</HorizontalStack>
												)}

												{calculateTax() > 0 && (
													<HorizontalStack align="space-between">
														<Text>Tax ({testData.taxRate || 0}%):</Text>
														<Text>{formatCurrency(calculateTax())}</Text>
													</HorizontalStack>
												)}

												<Divider />

												<HorizontalStack align="space-between">
													<Text variant="headingMd">Total:</Text>
													<Text variant="headingMd">
														{formatCurrency(calculateTotal())}
													</Text>
												</HorizontalStack>
											</VerticalStack>
										</Box>
									)}
								</VerticalStack>
							</Card>
						</>
					)}

					{currentTab === 'results' && (
						<>
							{loading && (
								<Card sectioned>
									<SkeletonBodyText lines={6} />
								</Card>
							)}

							{results && !loading && (
								<Card sectioned>
									<VerticalStack gap="4">
										<Text variant="headingMd" as="h3">
											Test Results
										</Text>

										<Box paddingBlockStart="200">
											<VerticalStack gap="2">
												<Text variant="headingMd" as="h4">
													Order Summary
												</Text>

												<HorizontalStack align="space-between">
													<Text>Items:</Text>
													<Text variant="bodyMd" fontWeight="semibold">
														{formatCurrency(results.originalPrice)}
													</Text>
												</HorizontalStack>

												{results.productDiscountAmount > 0 && (
													<HorizontalStack align="space-between">
														<Text tone="success">Product Discounts:</Text>
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															tone="success"
														>
															-{formatCurrency(results.productDiscountAmount)}
														</Text>
													</HorizontalStack>
												)}

												<HorizontalStack align="space-between">
													<Text>Shipping:</Text>
													<Text variant="bodyMd" fontWeight="semibold">
														{results.freeShippingApplied ? (
															<>
																<span
																	style={{
																		textDecoration: 'line-through',
																		marginRight: '8px',
																	}}
																>
																	{formatCurrency(results.originalShippingCost)}
																</span>
																<Text tone="success" as="span">
																	FREE
																</Text>
															</>
														) : (
															formatCurrency(results.shippingCost)
														)}
													</Text>
												</HorizontalStack>

												<HorizontalStack align="space-between">
													<Text>Subtotal:</Text>
													<Text variant="bodyMd" fontWeight="semibold">
														{formatCurrency(results.subtotal)}
													</Text>
												</HorizontalStack>

												{results.taxAmount > 0 && (
													<HorizontalStack align="space-between">
														<Text>
															Tax ({(results.taxRate * 100).toFixed(2)}%):
														</Text>
														<Text variant="bodyMd" fontWeight="semibold">
															{formatCurrency(results.taxAmount)}
														</Text>
													</HorizontalStack>
												)}

												<Divider />

												<HorizontalStack align="space-between">
													<Text variant="headingMd">Total:</Text>
													<Text variant="headingLg" fontWeight="bold">
														{formatCurrency(results.finalTotal)}
													</Text>
												</HorizontalStack>

												{results.totalDiscountAmount > 0 && (
													<HorizontalStack align="space-between">
														<Text variant="bodyMd" tone="success">
															You saved:
														</Text>
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															tone="success"
														>
															{formatCurrency(results.totalDiscountAmount)} (
															{results.savingsPercentage}%)
														</Text>
													</HorizontalStack>
												)}
											</VerticalStack>
										</Box>

										{results.appliedDiscounts &&
											results.appliedDiscounts.length > 0 && (
												<>
													<Divider />
													<VerticalStack gap="3">
														<HorizontalStack
															align="space-between"
															blockAlign="center"
														>
															<Text variant="headingMd" as="h4">
																Applied Discounts
															</Text>
															{results.savingsPercentage > 0 && (
																<Badge status="success">
																	{results.savingsPercentage}% Total Savings
																</Badge>
															)}
														</HorizontalStack>
														{results.appliedDiscounts.map((discount, index) => (
															<Box
																key={index}
																padding="200"
																background="bg-surface-secondary"
																borderRadius="200"
															>
																<VerticalStack gap="2">
																	<HorizontalStack
																		align="space-between"
																		blockAlign="center"
																	>
																		<HorizontalStack
																			gap="2"
																			blockAlign="center"
																		>
																			<Badge
																				status={
																					discount.isActive
																						? 'success'
																						: 'neutral'
																				}
																			>
																				{discount.type.replace('_', ' ')}
																			</Badge>
																			<Text
																				variant="bodyMd"
																				fontWeight="semibold"
																			>
																				{discount.type === 'percentage'
																					? `${discount.value}% off`
																					: discount.type === 'fixed_amount'
																					? `$${discount.value} off`
																					: discount.type === 'free_shipping'
																					? 'Free Shipping'
																					: discount.type === 'buy_x_get_y'
																					? (() => {
																							const buyQty =
																								discount.bogoDetails
																									?.buyQuantity ||
																								discount.value ||
																								1;
																							const getQty =
																								discount.bogoDetails
																									?.getQuantity || 1;
																							const freeItems =
																								discount.freeItems || 0;
																							return `Buy ${buyQty} Get ${getQty} Free${
																								freeItems > 0
																									? ` (${freeItems} free items)`
																									: ''
																							}`;
																					  })()
																					: `${discount.value} discount`}
																			</Text>
																		</HorizontalStack>
																		{discount.appliedAmount > 0 && (
																			<Text
																				variant="bodyMd"
																				fontWeight="semibold"
																				tone="success"
																			>
																				-
																				{formatCurrency(discount.appliedAmount)}
																			</Text>
																		)}
																		{discount.freeShipping && (
																			<Badge status="success" size="small">
																				Applied
																			</Badge>
																		)}
																	</HorizontalStack>
																	{discount.conditions && (
																		<Text variant="bodySm" color="subdued">
																			{discount.conditions.minimumAmount &&
																				`Min: ${formatCurrency(
																					discount.conditions.minimumAmount
																				)}`}
																			{discount.conditions.minimumQuantity &&
																				` • Min Qty: ${discount.conditions.minimumQuantity}`}
																			{discount.priority !== undefined &&
																				` • Priority: ${discount.priority}`}
																		</Text>
																	)}
																	{discount.type === 'buy_x_get_y' &&
																		discount.bogoDetails && (
																			<Text variant="bodySm" color="subdued">
																				Buy{' '}
																				{discount.bogoDetails.buyQuantity || 1}{' '}
																				Get{' '}
																				{discount.bogoDetails.getQuantity || 1}{' '}
																				• Sets Applied:{' '}
																				{discount.bogoDetails.completeBuySets ||
																					0}
																				{discount.bogoDetails.limitApplied &&
																					' • Limit Applied'}
																			</Text>
																		)}
																</VerticalStack>
															</Box>
														))}
													</VerticalStack>

													{results.skippedDiscounts &&
														results.skippedDiscounts.length > 0 && (
															<VerticalStack gap="3">
																<Text variant="headingMd" as="h4">
																	Skipped Discounts
																</Text>
																{results.stopOnFirstFailure && (
																	<Banner status="warning" tone="subdued">
																		Stop on First Failure is enabled. Discount
																		processing stopped after the first failed
																		condition.
																	</Banner>
																)}
																{results.skippedDiscounts.map(
																	(discount, index) => (
																		<Box
																			key={index}
																			padding="200"
																			background="bg-surface-critical-subdued"
																			borderRadius="200"
																		>
																			<VerticalStack gap="2">
																				<HorizontalStack
																					align="space-between"
																					blockAlign="center"
																				>
																					<HorizontalStack
																						gap="2"
																						blockAlign="center"
																					>
																						<Badge status="critical">
																							{discount.type.replace('_', ' ')}
																						</Badge>
																						<Text
																							variant="bodyMd"
																							fontWeight="semibold"
																						>
																							{discount.type === 'percentage'
																								? `${discount.value}% off`
																								: discount.type ===
																								  'fixed_amount'
																								? `$${discount.value} off`
																								: discount.type ===
																								  'free_shipping'
																								? 'Free Shipping'
																								: discount.type ===
																								  'buy_x_get_y'
																								? `Buy ${
																										discount.bogoConfig
																											?.buyQuantity ||
																										discount.value
																								  } Get ${
																										discount.bogoConfig
																											?.getQuantity || 1
																								  }`
																								: `${discount.value} discount`}
																						</Text>
																					</HorizontalStack>
																					<Badge status="critical" size="small">
																						Skipped
																					</Badge>
																				</HorizontalStack>
																				<Text variant="bodySm" color="critical">
																					Reason: {discount.skippedReason}
																				</Text>
																				{discount.priority !== undefined && (
																					<Text
																						variant="bodySm"
																						color="subdued"
																					>
																						Priority: {discount.priority}
																					</Text>
																				)}
																			</VerticalStack>
																		</Box>
																	)
																)}
															</VerticalStack>
														)}
												</>
											)}

										{results.appliedDiscounts &&
											results.appliedDiscounts.length === 0 && (
												<Banner status="info">
													No discounts were applied. Check that the cart meets
													all discount conditions.
												</Banner>
											)}
									</VerticalStack>
								</Card>
							)}
						</>
					)}
				</VerticalStack>
			</Modal.Section>
		</Modal>
	);
};

export default EnhancedTestDiscountModal;
