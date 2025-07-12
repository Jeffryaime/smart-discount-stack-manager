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

const UnifiedTestDiscountModal = ({ open, onClose, discountStack, onTest }) => {
	// Test data state
	const [testData, setTestData] = useState({
		products: [], // Array of { id, quantity, price, name, image, status, eligible }
		customerSegment: '',
		shippingCost: '',
		taxRate: '',
	});

	// Product management
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [searchFilter, setSearchFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState([]);
	const [vendorFilter, setVendorFilter] = useState([]);
	const [priceRangeFilter, setPriceRangeFilter] = useState('');
	const [eligibilityFilter, setEligibilityFilter] = useState([]); // New filter for eligible/ineligible

	// Modal state
	const [results, setResults] = useState(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});
	const [currentTab, setCurrentTab] = useState('products'); // 'products' or 'results'

	// Load products when modal opens
	useEffect(() => {
		if (open) {
			loadProducts();
		}
	}, [open]);

	// Apply filters and eligibility calculation
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

		// Calculate eligibility for each product
		filtered = filtered.map((product) => ({
			...product,
			eligible: calculateProductEligibility(product),
			isGiftCard:
				product.productType?.toLowerCase().includes('gift card') ||
				product.title?.toLowerCase().includes('gift card'),
		}));

		// Eligibility filter
		if (eligibilityFilter.length > 0) {
			filtered = filtered.filter((product) => {
				if (eligibilityFilter.includes('eligible') && product.eligible)
					return true;
				if (eligibilityFilter.includes('ineligible') && !product.eligible)
					return true;
				if (eligibilityFilter.includes('gift_cards') && product.isGiftCard)
					return true;
				return false;
			});
		}

		setFilteredProducts(filtered);
	}, [
		allProducts,
		searchFilter,
		statusFilter,
		vendorFilter,
		priceRangeFilter,
		eligibilityFilter,
		discountStack,
	]);

	const loadProducts = async () => {
		setLoadingProducts(true);
		try {
			const response = await discountStacksApi.getAllProducts(100);
			setAllProducts(response.products || []);
		} catch (error) {
			console.error('Error loading products:', error);
			setErrors({ products: 'Failed to load products' });
		} finally {
			setLoadingProducts(false);
		}
	};

	// Calculate if a product is eligible for any discount in the stack
	const calculateProductEligibility = (product) => {
		if (!discountStack?.discounts) return false;

		for (const discount of discountStack.discounts) {
			if (!discount.isActive) continue;

			// Check conditions.productIds
			if (discount.conditions?.productIds?.length > 0) {
				const productMatches = discount.conditions.productIds.some(
					(id) =>
						id === product.id ||
						id === product.gid ||
						id === product.id?.toString() ||
						id === product.gid?.toString()
				);
				if (productMatches) return true;
			}

			// Check conditions.collectionIds using product's collections data
			if (
				discount.conditions?.collectionIds?.length > 0 &&
				product.collections
			) {
				const collectionMatches = discount.conditions.collectionIds.some(
					(discountCollectionId) =>
						product.collections.some(
							(productCollection) =>
								discountCollectionId === productCollection.id ||
								discountCollectionId === productCollection.gid ||
								discountCollectionId === productCollection.id?.toString() ||
								discountCollectionId === productCollection.gid?.toString()
						)
				);
				if (collectionMatches) return true;
			}

			// Check BOGO specific eligibility
			if (discount.type === 'buy_x_get_y' && discount.bogoConfig) {
				const bogoMatches = [
					...(discount.bogoConfig.eligibleProductIds || []),
					...(discount.bogoConfig.freeProductIds || []),
				].some(
					(id) =>
						id === product.id ||
						id === product.gid ||
						id === product.id?.toString() ||
						id === product.gid?.toString()
				);
				if (bogoMatches) return true;
			}
		}

		return false;
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
				const product = filteredProducts.find((p) => p.id === productId);
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
								eligible: product.eligible,
								isGiftCard: product.isGiftCard,
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

	// Calculate eligible subtotal
	const calculateEligibleSubtotal = () => {
		return testData.products
			.filter((product) => product.eligible && !product.isGiftCard)
			.reduce((total, product) => total + product.price * product.quantity, 0);
	};

	// Calculate ineligible subtotal
	const calculateIneligibleSubtotal = () => {
		return testData.products
			.filter((product) => !product.eligible || product.isGiftCard)
			.reduce((total, product) => total + product.price * product.quantity, 0);
	};

	// Calculate total subtotal
	const calculateSubtotal = () => {
		return calculateEligibleSubtotal() + calculateIneligibleSubtotal();
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

	const validateInputs = () => {
		const newErrors = {};

		if (testData.products.length === 0) {
			newErrors.products = 'Please add at least one product to test';
		}

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
			setCurrentTab('products');
			return;
		}

		setLoading(true);
		setCurrentTab('results');

		try {
			// Separate eligible and ineligible items
			const eligibleItems = testData.products
				.filter((product) => product.eligible && !product.isGiftCard)
				.map((product) => ({
					productId: product.gid,
					quantity: product.quantity,
					price: product.price,
					title: product.name,
				}));

			const ineligibleItems = testData.products
				.filter((product) => !product.eligible || product.isGiftCard)
				.map((product) => ({
					productId: product.gid,
					quantity: product.quantity,
					price: product.price,
					title: product.name,
				}));

			const testPayload = {
				cartItems: [...eligibleItems, ...ineligibleItems], // All items
				eligibleItems, // Only eligible items for discount calculation
				ineligibleItems, // Ineligible items for reference
				originalPrice: calculateSubtotal(),
				eligibleSubtotal: calculateEligibleSubtotal(),
				ineligibleSubtotal: calculateIneligibleSubtotal(),
				productIds: [
					...eligibleItems.map((item) => item.productId), // GID format
					...testData.products
						.filter((p) => p.eligible && !p.isGiftCard)
						.map((p) => p.id), // Legacy ID format
				], // Both formats for compatibility
				quantity: testData.products
					.filter((p) => p.eligible && !p.isGiftCard)
					.reduce((sum, p) => sum + p.quantity, 0), // Total eligible quantity
				customerSegment: testData.customerSegment,
				shippingCost: calculateShipping(),
				taxRate: parseFloat(testData.taxRate) / 100 || 0,
				cartTotal: calculateTotal(),
			};

			console.log('🚀 Sending test payload:', testPayload);
			console.log(
				'📦 Products being tested:',
				testData.products.map((p) => ({
					id: p.id,
					gid: p.gid,
					name: p.name,
					quantity: p.quantity,
					eligible: p.eligible,
					isGiftCard: p.isGiftCard,
				}))
			);

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
			products: [],
			customerSegment: '',
			shippingCost: '',
			taxRate: '',
		});
		setResults(null);
		setErrors({});
		setCurrentTab('products');

		// Reset filters
		setSearchFilter('');
		setStatusFilter([]);
		setVendorFilter([]);
		setPriceRangeFilter('');
		setEligibilityFilter([]);

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
			eligibilityOptions: [
				{ label: 'Eligible', value: 'eligible' },
				{ label: 'Ineligible', value: 'ineligible' },
				{ label: 'Gift Cards', value: 'gift_cards' },
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
	if (eligibilityFilter.length > 0) {
		appliedFilters.push({
			key: 'eligibility',
			label: `Eligibility: ${eligibilityFilter.join(', ')}`,
			onRemove: () => setEligibilityFilter([]),
		});
	}

	const clearAllFilters = () => {
		setSearchFilter('');
		setStatusFilter([]);
		setVendorFilter([]);
		setPriceRangeFilter('');
		setEligibilityFilter([]);
	};

	const eligibleCount = testData.products.filter(
		(p) => p.eligible && !p.isGiftCard
	).length;
	const ineligibleCount = testData.products.filter(
		(p) => !p.eligible || p.isGiftCard
	).length;

	return (
		<Modal
			open={open}
			onClose={handleClose}
			title={`Test Discount Stack: ${discountStack?.name || ''}`}
			primaryAction={{
				content: currentTab === 'products' ? 'Run Test' : 'Run New Test',
				onAction:
					currentTab === 'products'
						? handleTest
						: () => setCurrentTab('products'),
				loading: loading,
				disabled:
					loading ||
					(currentTab === 'products' && testData.products.length === 0),
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
							pressed={currentTab === 'products'}
							onClick={() => setCurrentTab('products')}
						>
							Cart Setup ({eligibleCount} eligible, {ineligibleCount} other)
						</Button>
						<Button
							pressed={currentTab === 'results'}
							onClick={() => setCurrentTab('results')}
							disabled={!results && !loading}
						>
							Test Results
						</Button>
					</ButtonGroup>

					{currentTab === 'products' && (
						<>
							{/* Product Selection */}
							<Card>
								<VerticalStack gap="4">
									<Text variant="headingMd" as="h3">
										Product Selection
									</Text>
									<Text variant="bodySm" color="subdued">
										Products show eligibility for this discount stack. Add
										quantities for any products to simulate a real cart.
									</Text>

									{/* Filters */}
									{!loadingProducts && (
										<Filters
											queryValue={searchFilter}
											queryPlaceholder="Search products..."
											filters={[
												{
													key: 'eligibility',
													label: 'Eligibility',
													filter: (
														<ChoiceList
															title="Product Eligibility"
															titleHidden
															choices={filterOptions.eligibilityOptions}
															selected={eligibilityFilter}
															onChange={setEligibilityFilter}
															allowMultiple
														/>
													),
													shortcut: true,
												},
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
													const isDisabled = product.isGiftCard;

													return (
														<div
															key={product.id}
															data-testid={`product-item-${product.id}`}
															style={{
																padding: '12px 16px',
																borderBottom:
																	index < filteredProducts.length - 1
																		? '1px solid #e1e3e5'
																		: 'none',
																backgroundColor:
																	quantity > 0 ? '#f6f6f7' : 'transparent',
																opacity: isDisabled ? 0.6 : 1,
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
																		<HorizontalStack gap="2" align="start">
																			<Text
																				variant="bodyMd"
																				fontWeight="semibold"
																			>
																				{product.title}
																			</Text>
																			{product.eligible ? (
																				<Badge status="success">Eligible</Badge>
																			) : (
																				<Badge status="attention">
																					Ineligible
																				</Badge>
																			)}
																			{product.isGiftCard && (
																				<Badge status="info">Gift Card</Badge>
																			)}
																		</HorizontalStack>
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
																			disabled={isDisabled}
																			data-testid={`quantity-input-${product.id}`}
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
															{isDisabled && (
																<Text
																	variant="bodySm"
																	color="subdued"
																	alignment="center"
																>
																	Gift cards cannot be discounted by Shopify
																</Text>
															)}
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

							{/* Live Cart Breakdown */}
							{testData.products.length > 0 && (
								<Card>
									<VerticalStack gap="4">
										<Text variant="headingMd" as="h3">
											Live Cart Breakdown
										</Text>

										<VerticalStack gap="2">
											{/* Eligible Items */}
											{testData.products.filter(
												(p) => p.eligible && !p.isGiftCard
											).length > 0 && (
												<>
													<Text
														variant="bodyMd"
														fontWeight="medium"
														tone="success"
													>
														Eligible Items (will receive discounts):
													</Text>
													{testData.products
														.filter(
															(product) =>
																product.eligible && !product.isGiftCard
														)
														.map((product) => (
															<HorizontalStack
																key={`eligible-${product.id}`}
																align="space-between"
																gap="2"
															>
																<Text>
																	• {product.name} × {product.quantity}
																</Text>
																<Text fontWeight="medium">
																	{formatCurrency(
																		product.price * product.quantity
																	)}
																</Text>
															</HorizontalStack>
														))}
													<HorizontalStack align="space-between">
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															tone="success"
														>
															Eligible Subtotal:
														</Text>
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															tone="success"
														>
															{formatCurrency(calculateEligibleSubtotal())}
														</Text>
													</HorizontalStack>
												</>
											)}

											{/* Ineligible Items */}
											{testData.products.filter(
												(p) => !p.eligible || p.isGiftCard
											).length > 0 && (
												<>
													{calculateEligibleSubtotal() > 0 && <Divider />}
													<Text
														variant="bodyMd"
														fontWeight="medium"
														color="subdued"
													>
														Ineligible Items (no discounts applied):
													</Text>
													{testData.products
														.filter(
															(product) =>
																!product.eligible || product.isGiftCard
														)
														.map((product) => (
															<HorizontalStack
																key={`ineligible-${product.id}`}
																align="space-between"
																gap="2"
															>
																<Text color="subdued">
																	• {product.name} × {product.quantity}
																</Text>
																<Text fontWeight="medium" color="subdued">
																	{formatCurrency(
																		product.price * product.quantity
																	)}
																</Text>
															</HorizontalStack>
														))}
													<HorizontalStack align="space-between">
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															color="subdued"
														>
															Ineligible Subtotal:
														</Text>
														<Text
															variant="bodyMd"
															fontWeight="semibold"
															color="subdued"
														>
															{formatCurrency(calculateIneligibleSubtotal())}
														</Text>
													</HorizontalStack>
												</>
											)}

											<Divider />

											<HorizontalStack align="space-between">
												<Text variant="bodyMd" fontWeight="medium">
													Final Subtotal:
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

									{/* Final Order Total */}
									{testData.products.length > 0 && (
										<Box
											padding="3"
											background="bg-surface-secondary"
											borderRadius="200"
										>
											<VerticalStack gap="2">
												<Text variant="headingMd">Final Order Total</Text>

												<HorizontalStack align="space-between">
													<Text>Items Subtotal:</Text>
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
													<Text variant="headingMd">Grand Total:</Text>
													<Text variant="headingLg" fontWeight="bold">
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
											<VerticalStack gap="4">
												{/* Eligible Items Section */}
												{results.eligibleSubtotal > 0 && (
													<>
														<Text variant="headingMd" as="h4" tone="success">
															Eligible Items (Discounts Applied)
														</Text>
														<Box
															padding="3"
															background="bg-surface-success-subdued"
															borderRadius="200"
														>
															<VerticalStack gap="2">
																<HorizontalStack align="space-between">
																	<Text>Original Amount:</Text>
																	<Text variant="bodyMd" fontWeight="semibold">
																		{formatCurrency(results.eligibleSubtotal)}
																	</Text>
																</HorizontalStack>

																{results.productDiscountAmount > 0 && (
																	<HorizontalStack align="space-between">
																		<Text tone="success">
																			Discounts Applied:
																		</Text>
																		<Text
																			variant="bodyMd"
																			fontWeight="semibold"
																			tone="success"
																		>
																			-
																			{formatCurrency(
																				results.productDiscountAmount
																			)}
																		</Text>
																	</HorizontalStack>
																)}

																<Divider />

																<HorizontalStack align="space-between">
																	<Text variant="bodyMd" fontWeight="medium">
																		Final Eligible Amount:
																	</Text>
																	<Text variant="bodyMd" fontWeight="semibold">
																		{formatCurrency(
																			results.finalEligiblePrice ||
																				results.eligibleSubtotal -
																					results.productDiscountAmount
																		)}
																	</Text>
																</HorizontalStack>
															</VerticalStack>
														</Box>
													</>
												)}

												{/* Ineligible Items Section */}
												{results.ineligibleSubtotal > 0 && (
													<>
														<Text variant="headingMd" as="h4" color="subdued">
															Ineligible Items (No Discounts)
														</Text>
														<Box
															padding="3"
															background="bg-surface-secondary"
															borderRadius="200"
														>
															<VerticalStack gap="2">
																<HorizontalStack align="space-between">
																	<Text color="subdued">
																		Amount (unchanged):
																	</Text>
																	<Text
																		variant="bodyMd"
																		fontWeight="semibold"
																		color="subdued"
																	>
																		{formatCurrency(results.ineligibleSubtotal)}
																	</Text>
																</HorizontalStack>
																<Text variant="bodySm" color="subdued">
																	These items don't match any discount
																	conditions or are gift cards.
																</Text>
															</VerticalStack>
														</Box>
													</>
												)}

												{/* Order Summary */}
												<Text variant="headingMd" as="h4">
													Order Summary
												</Text>
												<VerticalStack gap="2">
													<HorizontalStack align="space-between">
														<Text>Items Total:</Text>
														<Text variant="bodyMd" fontWeight="semibold">
															{formatCurrency(
																results.finalPrice || results.originalPrice
															)}
														</Text>
													</HorizontalStack>

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
																		{formatCurrency(
																			results.originalShippingCost
																		)}
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
														<Text variant="headingMd">Final Total:</Text>
														<Text variant="headingLg" fontWeight="bold">
															{formatCurrency(results.finalTotal)}
														</Text>
													</HorizontalStack>

													{results.totalDiscountAmount > 0 && (
														<HorizontalStack align="space-between">
															<Text variant="bodyMd" tone="success">
																Total Savings:
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
											</VerticalStack>
										</Box>

										{/* Applied Discounts Details */}
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
																				{discount.type === 'buy_x_get_y'
																					? 'BOGO'
																					: discount.type.replace('_', ' ')}
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
																								discount.bogoConfig
																									?.buyQuantity ||
																								discount.value ||
																								1;
																							const getQty =
																								discount.bogoConfig
																									?.getQuantity || 1;
																							const freeItems =
																								discount.calculationDetails
																									?.freeItemsCount ||
																								discount.freeItems ||
																								0;
																							return `Buy ${buyQty} Get ${getQty} Free (${freeItems} items received)`;
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
																	{discount.type === 'buy_x_get_y' && (
																		<Text variant="bodySm" color="subdued">
																			{/* Show customer-friendly BOGO details */}
																			{discount.bogoConfig?.limitPerOrder &&
																				`Limit: ${discount.bogoConfig.limitPerOrder} per order`}
																			{discount.calculationDetails
																				?.limitApplied &&
																				(discount.bogoConfig?.limitPerOrder
																					? ' • Limit Applied'
																					: 'Limit Applied')}
																			{/* Fallback to legacy bogoDetails if available */}
																			{!discount.calculationDetails &&
																				discount.bogoDetails &&
																				discount.bogoDetails.limitApplied &&
																				(discount.bogoConfig?.limitPerOrder
																					? ' • Limit Applied'
																					: 'Limit Applied')}
																		</Text>
																	)}
																</VerticalStack>
															</Box>
														))}
													</VerticalStack>

													{/* Skipped Discounts */}
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

										{/* No Discounts Applied Message */}
										{results.appliedDiscounts &&
											results.appliedDiscounts.length === 0 && (
												<Banner status="info">
													No discounts were applied.{' '}
													{results.eligibleSubtotal > 0
														? 'Check that the cart meets all discount conditions.'
														: 'No eligible products found for the selected discount rules.'}
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

export default UnifiedTestDiscountModal;
