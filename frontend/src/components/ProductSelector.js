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
  Tooltip,
  Icon,
  InlineError,
  Checkbox,
  Filters,
  ChoiceList,
  EmptyState
} from '@shopify/polaris';
import { SearchMajor, DeleteMinor, ViewMajor } from '@shopify/polaris-icons';
import { discountStacksApi } from '../services/api';

const ProductSelector = ({ 
  label, 
  value = [], 
  onChange, 
  helpText,
  error,
  disabled = false
}) => {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showRawInput, setShowRawInput] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Convert value prop to selected products
  useEffect(() => {
    const currentIds = Array.isArray(value) ? value : [];
    setSelectedProducts(currentIds);
  }, [value]);

  // Load all products
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await discountStacksApi.getAllProducts(100);
      setAllProducts(response.products || []);
      setFilteredProducts(response.products || []);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allProducts];

    // Filter by status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(product => statusFilter.includes(product.status));
    }

    // Filter by search text
    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(search) ||
        product.handle.toLowerCase().includes(search)
      );
    }

    setFilteredProducts(filtered);
  }, [allProducts, statusFilter, searchFilter]);

  // Handle product selection
  const handleProductSelect = (productId, isSelected) => {
    let newSelection = [...selectedProducts];
    
    if (isSelected) {
      if (!newSelection.includes(productId)) {
        newSelection.push(productId);
      }
    } else {
      newSelection = newSelection.filter(id => id !== productId);
    }
    
    setSelectedProducts(newSelection);
    onChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    const activeProductIds = filteredProducts
      .filter(product => product.status === 'ACTIVE')
      .map(product => product.gid);
    
    setSelectedProducts(activeProductIds);
    onChange(activeProductIds);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedProducts([]);
    onChange([]);
  };

  // Handle raw input
  const handleRawInputSubmit = () => {
    if (!rawInput.trim()) return;

    const rawIds = rawInput
      .split(/[,\n\s]+/)
      .map(id => id.trim())
      .filter(Boolean);

    const productIdRegex = /^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/;
    const validIds = rawIds.filter(id => productIdRegex.test(id));

    if (validIds.length > 0) {
      const currentIds = Array.isArray(value) ? value : [];
      const newValue = [...new Set([...currentIds, ...validIds])];
      onChange(newValue);
      setRawInput('');
      setShowRawInput(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Format product price
  const formatProductPrice = (product) => {
    if (product.minPrice === product.maxPrice) {
      return formatCurrency(product.minPrice, product.currency);
    }
    return `${formatCurrency(product.minPrice, product.currency)} - ${formatCurrency(product.maxPrice, product.currency)}`;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusColors = {
      'ACTIVE': 'success',
      'DRAFT': 'info',
      'ARCHIVED': 'warning'
    };
    return <Badge status={statusColors[status] || 'info'}>{status}</Badge>;
  };

  // Filter options
  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Product Status"
          titleHidden
          choices={[
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Archived', value: 'ARCHIVED' }
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${statusFilter.join(', ')}`,
      onRemove: () => setStatusFilter([]),
    });
  }

  const selectedCount = selectedProducts.length;
  const activeCount = filteredProducts.filter(p => p.status === 'ACTIVE').length;

  return (
    <VerticalStack gap="3">
      <Text variant="bodyMd" fontWeight="medium">{label}</Text>
      
      {/* Load Products / Controls */}
      <Card sectioned>
        <VerticalStack gap="3">
          {!isLoaded ? (
            <HorizontalStack gap="2" align="center">
              <Button 
                primary 
                onClick={loadProducts} 
                loading={isLoading}
                disabled={disabled}
              >
                Load All Products
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
                  {selectedCount} of {filteredProducts.length} products selected
                </Text>
                <HorizontalStack gap="2">
                  <Button 
                    size="slim" 
                    onClick={handleSelectAll}
                    disabled={disabled || activeCount === 0}
                  >
                    Select All Active
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
                queryPlaceholder="Search products..."
                filters={filters}
                appliedFilters={appliedFilters}
                onQueryChange={setSearchFilter}
                onQueryClear={() => setSearchFilter('')}
                onClearAll={() => {
                  setSearchFilter('');
                  setStatusFilter([]);
                }}
              />
            </VerticalStack>
          )}

          {/* Raw Input */}
          {showRawInput && (
            <Box padding="3" background="bg-surface-secondary" borderRadius="200">
              <VerticalStack gap="2">
                <Text variant="bodyMd" fontWeight="medium">Enter Product IDs</Text>
                <TextField
                  value={rawInput}
                  onChange={setRawInput}
                  placeholder="123456, 789012, gid://shopify/Product/123456"
                  helpText="Enter product IDs separated by commas, spaces, or new lines"
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
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card sectioned>
          <HorizontalStack align="center" gap="2">
            <Spinner size="small" />
            <Text variant="bodySm">Loading products...</Text>
          </HorizontalStack>
        </Card>
      )}

      {/* Product List */}
      {isLoaded && filteredProducts.length > 0 && (
        <Card>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <VerticalStack gap="0">
              {filteredProducts.map((product, index) => {
                const isSelected = selectedProducts.includes(product.gid);
                const isActive = product.status === 'ACTIVE';
                
                return (
                  <div
                    key={product.gid}
                    style={{ 
                      padding: '12px 16px',
                      borderBottom: index < filteredProducts.length - 1 ? '1px solid #e1e3e5' : 'none',
                      backgroundColor: isSelected ? '#f6f6f7' : 'transparent',
                      opacity: disabled ? 0.6 : 1
                    }}
                  >
                    <HorizontalStack gap="3" align="space-between">
                      <HorizontalStack gap="3" align="start">
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleProductSelect(product.gid, checked)}
                          disabled={disabled}
                        />
                        <Thumbnail
                          source={product.imageUrl || ''}
                          alt={product.imageAlt || product.title}
                          size="small"
                        />
                        <VerticalStack gap="1">
                          <Text variant="bodyMd" fontWeight="semibold">
                            {product.title}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            ID: {product.id}
                          </Text>
                          <HorizontalStack gap="2" align="start">
                            <Text variant="bodySm" fontWeight="medium">
                              {formatProductPrice(product)}
                            </Text>
                            {getStatusBadge(product.status)}
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
      {isLoaded && filteredProducts.length === 0 && allProducts.length > 0 && (
        <Card sectioned>
          <EmptyState
            heading="No products match your filters"
            action={{
              content: 'Clear filters',
              onAction: () => {
                setSearchFilter('');
                setStatusFilter([]);
              }
            }}
          >
            <Text variant="bodySm" color="subdued">
              Try adjusting your search or filters to find products.
            </Text>
          </EmptyState>
        </Card>
      )}

      {/* No Products State */}
      {isLoaded && allProducts.length === 0 && (
        <Card sectioned>
          <EmptyState
            heading="No products found"
            action={{
              content: 'Reload products',
              onAction: loadProducts
            }}
          >
            <Text variant="bodySm" color="subdued">
              No products were found in your store.
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

export default ProductSelector;