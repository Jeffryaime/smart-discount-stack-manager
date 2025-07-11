import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  TextField,
  Button,
  HorizontalStack,
  VerticalStack,
  Text,
  Thumbnail,
  Badge,
  Spinner,
  Box,
  InlineError,
  Checkbox,
  Filters,
  ChoiceList,
  EmptyState,
  Tabs,
  Tag,
  Select,
  Banner
} from '@shopify/polaris';
import { SearchMajor, DeleteMinor, ViewMajor } from '@shopify/polaris-icons';
import { discountStacksApi } from '../services/api';

const UnifiedProductSelector = ({ 
  label, 
  value = [], 
  onChange, 
  helpText,
  error,
  disabled = false,
  mode = 'products' // 'products', 'collections', 'variants'
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showRawInput, setShowRawInput] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [filterMetadata, setFilterMetadata] = useState({});
  const [hiddenGiftCardsCount, setHiddenGiftCardsCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [inventoryFilter, setInventoryFilter] = useState([]);
  const [vendorFilter, setVendorFilter] = useState([]);
  const [productTypeFilter, setProductTypeFilter] = useState([]);
  const [tagsFilter, setTagsFilter] = useState([]);

  // Tab configuration
  const tabs = [
    { id: 'products', content: 'Products', panelID: 'products-panel' },
    { id: 'collections', content: 'Collections', panelID: 'collections-panel' },
    { id: 'variants', content: 'SKUs', panelID: 'variants-panel' }
  ];

  const currentMode = tabs[selectedTab]?.id || 'products';

  // Convert value prop to selected items
  useEffect(() => {
    const currentIds = Array.isArray(value) ? value : [];
    setSelectedItems(currentIds);
  }, [value]);

  // Load filter metadata on mount
  useEffect(() => {
    loadFilterMetadata();
  }, []);

  // Load items when tab changes
  useEffect(() => {
    if (selectedTab !== undefined) {
      setIsLoaded(false);
      setAllItems([]);
      setFilteredItems([]);
    }
  }, [selectedTab]);

  const loadFilterMetadata = async () => {
    try {
      const metadata = await discountStacksApi.getFilterMetadata();
      setFilterMetadata(metadata);
      setLoadError(''); // Clear any previous errors
    } catch (error) {
      console.error('Error loading filter metadata:', error);
      setLoadError('Failed to load filter options. Please check your connection and try again.');
    }
  };

  // Load items based on current mode
  const loadItems = async () => {
    setIsLoading(true);
    setLoadError(''); // Clear any previous errors
    try {
      let response;
      switch (currentMode) {
        case 'collections':
          response = await discountStacksApi.getAllCollections(100);
          setAllItems(response.collections || []);
          setFilteredItems(response.collections || []);
          break;
        case 'variants':
          response = await discountStacksApi.getAllVariants(100);
          setAllItems(response.variants || []);
          setFilteredItems(response.variants || []);
          break;
        default: // products
          response = await discountStacksApi.getAllProducts(100);
          setAllItems(response.products || []);
          setFilteredItems(response.products || []);
          break;
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading items:', error);
      setLoadError(`Failed to load ${currentMode}. Please check your connection and try again.`);
      setAllItems([]);
      setFilteredItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allItems];

    // Filter out Gift Cards by default with special handling
    let giftCardsCount = 0;
    if (currentMode === 'products') {
      filtered = filtered.filter(item => {
        const isGiftCard = item.productType?.toLowerCase().includes('gift card') ||
                          item.title?.toLowerCase().includes('gift card') ||
                          item.tags?.some(tag => tag.toLowerCase().includes('gift card'));
        if (isGiftCard) giftCardsCount++;
        return !isGiftCard;
      });
      setHiddenGiftCardsCount(giftCardsCount);
    }

    // Search filter
    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(item => {
        if (currentMode === 'variants') {
          return item.title.toLowerCase().includes(search) ||
                 item.sku.toLowerCase().includes(search) ||
                 item.product?.title.toLowerCase().includes(search);
        }
        return item.title.toLowerCase().includes(search) ||
               item.handle?.toLowerCase().includes(search);
      });
    }

    // Status filter (for products)
    if (statusFilter.length > 0 && currentMode === 'products') {
      filtered = filtered.filter(item => statusFilter.includes(item.status));
    }

    // Inventory filter
    if (inventoryFilter.length > 0) {
      filtered = filtered.filter(item => {
        const inventory = getInventoryQuantity(item);
        return inventoryFilter.some(filter => {
          switch (filter) {
            case 'in_stock': return inventory > 10;
            case 'low_stock': return inventory > 0 && inventory <= 10;
            case 'out_of_stock': return inventory <= 0;
            default: return true;
          }
        });
      });
    }

    // Vendor filter
    if (vendorFilter.length > 0) {
      filtered = filtered.filter(item => {
        const vendor = item.vendor || item.product?.vendor;
        return vendor && vendorFilter.includes(vendor);
      });
    }

    // Product type filter
    if (productTypeFilter.length > 0) {
      filtered = filtered.filter(item => {
        const productType = item.productType || item.product?.productType;
        return productType && productTypeFilter.includes(productType);
      });
    }

    // Tags filter
    if (tagsFilter.length > 0) {
      filtered = filtered.filter(item => {
        const tags = item.tags || [];
        return tagsFilter.some(tag => tags.includes(tag));
      });
    }

    setFilteredItems(filtered);
  }, [allItems, searchFilter, statusFilter, inventoryFilter, vendorFilter, productTypeFilter, tagsFilter, currentMode]);

  // Handle item selection
  const handleItemSelect = (itemId, isSelected) => {
    let newSelection = [...selectedItems];
    
    if (isSelected) {
      if (!newSelection.includes(itemId)) {
        newSelection.push(itemId);
      }
    } else {
      newSelection = newSelection.filter(id => id !== itemId);
    }
    
    setSelectedItems(newSelection);
    onChange(newSelection);
  };

  // Handle select all filtered
  const handleSelectAllFiltered = () => {
    const activeItemIds = filteredItems
      .filter(item => {
        if (currentMode === 'products') return item.status === 'ACTIVE';
        if (currentMode === 'variants') return item.availableForSale;
        return true; // collections don't have active status
      })
      .map(item => item.gid);
    
    const newSelection = [...new Set([...selectedItems, ...activeItemIds])];
    setSelectedItems(newSelection);
    onChange(newSelection);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedItems([]);
    onChange([]);
  };

  // Clear specific filter
  const handleFilterRemove = (filterKey) => {
    switch (filterKey) {
      case 'status': setStatusFilter([]); break;
      case 'inventory': setInventoryFilter([]); break;
      case 'vendor': setVendorFilter([]); break;
      case 'productType': setProductTypeFilter([]); break;
      case 'tags': setTagsFilter([]); break;
      case 'search': setSearchFilter(''); break;
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setStatusFilter([]);
    setInventoryFilter([]);
    setVendorFilter([]);
    setProductTypeFilter([]);
    setTagsFilter([]);
  };

  // Handle raw input
  const handleRawInputSubmit = () => {
    if (!rawInput.trim()) return;

    const rawIds = rawInput
      .split(/[,\n\s]+/)
      .map(id => id.trim())
      .filter(Boolean);

    let productIdRegex;
    switch (currentMode) {
      case 'collections':
        productIdRegex = /^(?:\d+|gid:\/\/shopify\/Collection\/\d+)$/;
        break;
      case 'variants':
        productIdRegex = /^(?:\d+|gid:\/\/shopify\/ProductVariant\/\d+)$/;
        break;
      default:
        productIdRegex = /^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/;
        break;
    }

    const validIds = rawIds.filter(id => productIdRegex.test(id));

    if (validIds.length > 0) {
      const newValue = [...new Set([...selectedItems, ...validIds])];
      onChange(newValue);
      setRawInput('');
      setShowRawInput(false);
    }
  };

  // Helper function to standardize inventory quantity retrieval
  const getInventoryQuantity = (item) => {
    if (typeof item.inventoryQuantity === 'number') {
      return item.inventoryQuantity;
    }
    if (typeof item.inventory === 'number') {
      return item.inventory;
    }
    return 0;
  };

  // Get inventory status badge
  const getInventoryBadge = (item) => {
    const inventory = getInventoryQuantity(item);
    if (inventory > 10) return <Badge status="success">In Stock</Badge>;
    if (inventory > 0) return <Badge status="warning">Low Stock</Badge>;
    return <Badge status="critical">Out of Stock</Badge>;
  };

  // Format price for display
  const formatPrice = (item) => {
    if (currentMode === 'variants') {
      const price = item.price;
      if (typeof price === 'number' && !isNaN(price) && price !== null && price !== undefined) {
        return `$${price.toFixed(2)}`;
      }
      return 'N/A';
    }
    
    const minPrice = item.minPrice;
    const maxPrice = item.maxPrice;
    
    // Check if minPrice and maxPrice are valid numbers
    const isValidMinPrice = typeof minPrice === 'number' && !isNaN(minPrice) && minPrice !== null && minPrice !== undefined;
    const isValidMaxPrice = typeof maxPrice === 'number' && !isNaN(maxPrice) && maxPrice !== null && maxPrice !== undefined;
    
    if (!isValidMinPrice && !isValidMaxPrice) {
      return 'N/A';
    }
    
    if (!isValidMinPrice) {
      return isValidMaxPrice ? `$${maxPrice.toFixed(2)}` : 'N/A';
    }
    
    if (!isValidMaxPrice) {
      return `$${minPrice.toFixed(2)}`;
    }
    
    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(2)}`;
    }
    
    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  };

  // Get item display title
  const getItemTitle = (item) => {
    if (currentMode === 'variants') {
      return `${item.product?.title} - ${item.title}`;
    }
    return item.title;
  };

  // Get item subtitle
  const getItemSubtitle = (item) => {
    if (currentMode === 'variants') {
      return `SKU: ${item.sku || 'No SKU'}`;
    }
    if (currentMode === 'collections') {
      return `${item.productsCount} products`;
    }
    return `ID: ${item.id}`;
  };

  // Build filter components
  const getFilterComponents = () => {
    const filters = [
      {
        key: 'search',
        label: 'Search',
        filter: null, // Handled by main search
        shortcut: false,
      }
    ];

    if (currentMode === 'products') {
      filters.push({
        key: 'status',
        label: 'Status',
        filter: (
          <ChoiceList
            title="Product Status"
            titleHidden
            choices={filterMetadata.statusOptions || []}
            selected={statusFilter}
            onChange={setStatusFilter}
            allowMultiple
          />
        ),
        shortcut: true,
      });
    }

    if (currentMode !== 'collections') {
      filters.push({
        key: 'inventory',
        label: 'Inventory',
        filter: (
          <ChoiceList
            title="Inventory Status"
            titleHidden
            choices={filterMetadata.inventoryOptions || []}
            selected={inventoryFilter}
            onChange={setInventoryFilter}
            allowMultiple
          />
        ),
        shortcut: true,
      });
    }

    if (filterMetadata.vendors?.length > 0) {
      filters.push({
        key: 'vendor',
        label: 'Vendor',
        filter: (
          <ChoiceList
            title="Vendor"
            titleHidden
            choices={filterMetadata.vendors.map(v => ({ label: v, value: v }))}
            selected={vendorFilter}
            onChange={setVendorFilter}
            allowMultiple
          />
        ),
        shortcut: false,
      });
    }

    if (filterMetadata.productTypes?.length > 0) {
      filters.push({
        key: 'productType',
        label: 'Product Type',
        filter: (
          <ChoiceList
            title="Product Type"
            titleHidden
            choices={filterMetadata.productTypes.map(pt => ({ label: pt, value: pt }))}
            selected={productTypeFilter}
            onChange={setProductTypeFilter}
            allowMultiple
          />
        ),
        shortcut: false,
      });
    }

    return filters;
  };

  // Build applied filters
  const getAppliedFilters = () => {
    const applied = [];

    if (statusFilter.length > 0) {
      applied.push({
        key: 'status',
        label: `Status: ${statusFilter.join(', ')}`,
        onRemove: () => handleFilterRemove('status'),
      });
    }

    if (inventoryFilter.length > 0) {
      applied.push({
        key: 'inventory',
        label: `Inventory: ${inventoryFilter.map(f => {
          const option = filterMetadata.inventoryOptions?.find(o => o.value === f);
          return option?.label || f;
        }).join(', ')}`,
        onRemove: () => handleFilterRemove('inventory'),
      });
    }

    if (vendorFilter.length > 0) {
      applied.push({
        key: 'vendor',
        label: `Vendor: ${vendorFilter.join(', ')}`,
        onRemove: () => handleFilterRemove('vendor'),
      });
    }

    if (productTypeFilter.length > 0) {
      applied.push({
        key: 'productType',
        label: `Type: ${productTypeFilter.join(', ')}`,
        onRemove: () => handleFilterRemove('productType'),
      });
    }

    if (tagsFilter.length > 0) {
      applied.push({
        key: 'tags',
        label: `Tags: ${tagsFilter.join(', ')}`,
        onRemove: () => handleFilterRemove('tags'),
      });
    }

    return applied;
  };

  const selectedCount = selectedItems.length;
  const filteredActiveCount = filteredItems.filter(item => {
    if (currentMode === 'products') return item.status === 'ACTIVE';
    if (currentMode === 'variants') return item.availableForSale;
    return true;
  }).length;

  return (
    <VerticalStack gap="3">
      <Text variant="bodyMd" fontWeight="medium">{label}</Text>
      
      {/* Error Banner */}
      {loadError && (
        <Banner
          title="Error Loading Data"
          status="critical"
          onDismiss={() => setLoadError('')}
        >
          <Text variant="bodySm">
            {loadError}
          </Text>
        </Banner>
      )}
      
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <VerticalStack gap="3">
            {/* Load Items / Controls */}
            {!isLoaded ? (
              <HorizontalStack gap="2" align="center">
                <Button 
                  primary 
                  onClick={loadItems} 
                  loading={isLoading}
                  disabled={disabled}
                >
                  Load {tabs[selectedTab]?.content}
                </Button>
                <Button 
                  plain 
                  onClick={() => setShowRawInput(!showRawInput)}
                  disabled={disabled}
                  icon={ViewMajor}
                >
                  Raw IDs
                </Button>
              </HorizontalStack>
            ) : (
              <VerticalStack gap="3">
                {/* Selection Summary */}
                <HorizontalStack gap="2" align="space-between">
                  <Text variant="bodySm" color="subdued">
                    {selectedCount} selected • {filteredItems.length} {currentMode} shown
                  </Text>
                  <HorizontalStack gap="2">
                    <Button 
                      size="slim" 
                      onClick={handleSelectAllFiltered}
                      disabled={disabled || filteredActiveCount === 0}
                    >
                      Select All Filtered ({filteredActiveCount})
                    </Button>
                    <Button 
                      size="slim" 
                      onClick={handleDeselectAll}
                      disabled={disabled || selectedCount === 0}
                    >
                      Deselect All
                    </Button>
                    <Button 
                      size="slim" 
                      onClick={() => setShowRawInput(!showRawInput)}
                      disabled={disabled}
                      icon={ViewMajor}
                    >
                      Raw IDs
                    </Button>
                  </HorizontalStack>
                </HorizontalStack>

                {/* Filters */}
                <Filters
                  queryValue={searchFilter}
                  queryPlaceholder={`Search ${currentMode}...`}
                  filters={getFilterComponents()}
                  appliedFilters={getAppliedFilters()}
                  onQueryChange={setSearchFilter}
                  onQueryClear={() => setSearchFilter('')}
                  onClearAll={handleClearAllFilters}
                />
              </VerticalStack>
            )}

            {/* Raw Input */}
            {showRawInput && (
              <Box padding="3" background="bg-surface-secondary" borderRadius="200">
                <VerticalStack gap="2">
                  <Text variant="bodyMd" fontWeight="medium">Enter {tabs[selectedTab]?.content} IDs</Text>
                  <TextField
                    value={rawInput}
                    onChange={setRawInput}
                    placeholder={`123456, 789012, gid://shopify/${currentMode === 'collections' ? 'Collection' : currentMode === 'variants' ? 'ProductVariant' : 'Product'}/123456`}
                    helpText={`Enter ${currentMode} IDs separated by commas, spaces, or new lines`}
                    multiline={3}
                    disabled={disabled}
                    autoComplete="off"
                  />
                  <HorizontalStack gap="2">
                    <Button 
                      size="slim" 
                      primary 
                      onClick={handleRawInputSubmit}
                      disabled={!rawInput.trim() || disabled}
                    >
                      Add IDs
                    </Button>
                    <Button 
                      size="slim" 
                      onClick={() => {
                        setRawInput('');
                        setShowRawInput(false);
                      }}
                      disabled={disabled}
                    >
                      Cancel
                    </Button>
                  </HorizontalStack>
                </VerticalStack>
              </Box>
            )}
          </VerticalStack>
        </Tabs>
      </Card>

      {/* Gift Cards Hidden Notice */}
      {hiddenGiftCardsCount > 0 && currentMode === 'products' && (
        <Banner
          title={`${hiddenGiftCardsCount} Gift Card${hiddenGiftCardsCount !== 1 ? 's' : ''} hidden`}
          status="info"
          onDismiss={() => setHiddenGiftCardsCount(0)}
        >
          <Text variant="bodySm">
            Gift cards are automatically excluded from discount eligibility to prevent policy violations.
          </Text>
        </Banner>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card sectioned>
          <HorizontalStack align="center" gap="2">
            <Spinner size="small" />
            <Text variant="bodySm">Loading {currentMode}...</Text>
          </HorizontalStack>
        </Card>
      )}

      {/* Items List */}
      {isLoaded && filteredItems.length > 0 && (
        <Card>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <VerticalStack gap="0">
              {filteredItems.map((item, index) => {
                const isSelected = selectedItems.includes(item.gid);
                const isActive = currentMode === 'products' ? item.status === 'ACTIVE' : 
                                currentMode === 'variants' ? item.availableForSale : true;
                
                return (
                  <div
                    key={item.gid}
                    style={{ 
                      padding: '12px 16px',
                      borderBottom: index < filteredItems.length - 1 ? '1px solid #e1e3e5' : 'none',
                      backgroundColor: isSelected ? '#f6f6f7' : 'transparent',
                      opacity: disabled ? 0.6 : 1
                    }}
                  >
                    <HorizontalStack gap="3" align="space-between">
                      <HorizontalStack gap="3" align="start">
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleItemSelect(item.gid, checked)}
                          disabled={disabled}
                        />
                        <Thumbnail
                          source={item.imageUrl || ''}
                          alt={item.imageAlt || item.title}
                          size="small"
                        />
                        <VerticalStack gap="1">
                          <Text variant="bodyMd" fontWeight="semibold">
                            {getItemTitle(item)}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {getItemSubtitle(item)}
                          </Text>
                          <HorizontalStack gap="2" align="start">
                            <Text variant="bodySm" fontWeight="medium">
                              {formatPrice(item)}
                            </Text>
                            {currentMode === 'products' && (
                              <Badge status={item.status === 'ACTIVE' ? 'success' : 'info'}>
                                {item.status}
                              </Badge>
                            )}
                            {currentMode !== 'collections' && getInventoryBadge(item)}
                            {currentMode === 'variants' && !item.availableForSale && (
                              <Badge status="critical">Unavailable</Badge>
                            )}
                          </HorizontalStack>
                        </VerticalStack>
                      </HorizontalStack>
                    </HorizontalStack>
                  </div>
                );
              })}
            </VerticalStack>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {isLoaded && filteredItems.length === 0 && allItems.length > 0 && (
        <Card sectioned>
          <EmptyState
            heading={`No ${currentMode} match your filters`}
            action={{
              content: 'Clear filters',
              onAction: handleClearAllFilters
            }}
          >
            <Text variant="bodySm" color="subdued">
              Try adjusting your search or filters to find {currentMode}.
            </Text>
          </EmptyState>
        </Card>
      )}

      {/* No Items State */}
      {isLoaded && allItems.length === 0 && (
        <Card sectioned>
          <EmptyState
            heading={`No ${currentMode} found`}
            action={{
              content: `Reload ${currentMode}`,
              onAction: loadItems
            }}
          >
            <Text variant="bodySm" color="subdued">
              No {currentMode} were found in your store.
            </Text>
          </EmptyState>
        </Card>
      )}

      {/* Help Text and Error */}
      {helpText && (
        <Text variant="bodySm" color="subdued">
          {helpText}
        </Text>
      )}
      
      {error && <InlineError message={error} />}
    </VerticalStack>
  );
};

export default UnifiedProductSelector;