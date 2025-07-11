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
  InlineError
} from '@shopify/polaris';
import { SearchMajor, DeleteMinor, ViewMajor } from '@shopify/polaris-icons';
import { discountStacksApi } from '../services/api';

const ProductSelector = ({ 
  label, 
  value = [], 
  onChange, 
  placeholder = "Search for products...",
  helpText,
  error,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRawInput, setShowRawInput] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Debounced search function
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await discountStacksApi.searchProducts(query.trim());
      setSearchResults(response.products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Update selected products when value prop changes
  useEffect(() => {
    const productIds = Array.isArray(value) ? value : [];
    setSelectedProducts(productIds.map(id => ({ id, isValidated: false })));
  }, [value]);

  const handleProductSelect = (product) => {
    const productId = product.id.toString();
    const currentIds = Array.isArray(value) ? value : [];
    
    if (!currentIds.includes(productId)) {
      const newValue = [...currentIds, productId];
      onChange(newValue);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleProductRemove = (productId) => {
    const currentIds = Array.isArray(value) ? value : [];
    const newValue = currentIds.filter(id => id !== productId);
    onChange(newValue);
  };

  const handleRawInputSubmit = () => {
    if (!rawInput.trim()) return;

    // Parse raw input - split by commas, newlines, or spaces
    const rawIds = rawInput
      .split(/[,\n\s]+/)
      .map(id => id.trim())
      .filter(Boolean);

    // Validate product IDs (should be numeric or Shopify GID format)
    const productIdRegex = /^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/;
    const validIds = rawIds.filter(id => {
      if (!productIdRegex.test(id)) {
        console.warn(`Invalid product ID format: "${id}"`);
        return false;
      }
      return true;
    });

    if (validIds.length > 0) {
      const currentIds = Array.isArray(value) ? value : [];
      const newIds = validIds.filter(id => !currentIds.includes(id));
      const newValue = [...currentIds, ...newIds];
      onChange(newValue);
    }

    setRawInput('');
    setShowRawInput(false);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatProductPrice = (product) => {
    if (product.minPrice === product.maxPrice) {
      return formatCurrency(product.minPrice, product.currency);
    }
    return `${formatCurrency(product.minPrice, product.currency)} - ${formatCurrency(product.maxPrice, product.currency)}`;
  };

  return (
    <VerticalStack gap="3">
      <Text variant="bodyMd" fontWeight="medium">{label}</Text>
      
      {/* Search Input */}
      <Card sectioned>
        <VerticalStack gap="3">
          <HorizontalStack gap="2" align="space-between">
            <div style={{ flex: 1 }}>
              <TextField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={placeholder}
                prefix={<Icon source={SearchMajor} />}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <Tooltip content="Advanced: Enter product IDs directly">
              <Button
                plain
                icon={ViewMajor}
                onClick={() => setShowRawInput(!showRawInput)}
                pressed={showRawInput}
                disabled={disabled}
              >
                Raw IDs
              </Button>
            </Tooltip>
          </HorizontalStack>

          {/* Raw Input Section */}
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

          {/* Search Results */}
          {isSearching && (
            <Box padding="4">
              <HorizontalStack align="center" gap="2">
                <Spinner size="small" />
                <Text variant="bodySm">Searching products...</Text>
              </HorizontalStack>
            </Box>
          )}

          {searchResults.length > 0 && !isSearching && (
            <VerticalStack gap="2">
              <Text variant="bodyMd" fontWeight="medium">Search Results</Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <VerticalStack gap="2">
                  {searchResults.map((product) => (
                    <Card key={product.id}>
                      <div 
                        style={{ 
                          padding: '12px',
                          cursor: disabled ? 'default' : 'pointer',
                          opacity: disabled ? 0.6 : 1
                        }}
                        onClick={() => !disabled && handleProductSelect(product)}
                      >
                        <HorizontalStack gap="3" align="space-between">
                          <HorizontalStack gap="3" align="start">
                            <Thumbnail
                              source={product.image || ''}
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
                              <HorizontalStack gap="2">
                                <Text variant="bodySm" fontWeight="medium">
                                  {formatProductPrice(product)}
                                </Text>
                                <Badge status={product.status === 'ACTIVE' ? 'success' : 'critical'}>
                                  {product.status}
                                </Badge>
                              </HorizontalStack>
                            </VerticalStack>
                          </HorizontalStack>
                          {!disabled && (
                            <Button size="slim" primary>
                              Select
                            </Button>
                          )}
                        </HorizontalStack>
                      </div>
                    </Card>
                  ))}
                </VerticalStack>
              </div>
            </VerticalStack>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <Box padding="4">
              <Text variant="bodySm" color="subdued" alignment="center">
                No products found for "{searchQuery}"
              </Text>
            </Box>
          )}
        </VerticalStack>
      </Card>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <Card sectioned>
          <VerticalStack gap="3">
            <HorizontalStack align="space-between">
              <Text variant="bodyMd" fontWeight="medium">
                Selected Products ({selectedProducts.length})
              </Text>
              <Button 
                size="slim" 
                destructive 
                onClick={() => onChange([])}
                disabled={disabled}
              >
                Clear All
              </Button>
            </HorizontalStack>
            
            <VerticalStack gap="2">
              {selectedProducts.map((product) => (
                <Card key={product.id}>
                  <div style={{ padding: '8px 12px' }}>
                    <HorizontalStack align="space-between">
                      <HorizontalStack gap="2" align="center">
                        <Text variant="bodyMd">
                          Product ID: {product.id}
                        </Text>
                        {!product.isValidated && (
                          <Badge status="warning" size="small">Unvalidated</Badge>
                        )}
                      </HorizontalStack>
                      <Button
                        plain
                        destructive
                        icon={DeleteMinor}
                        onClick={() => handleProductRemove(product.id)}
                        disabled={disabled}
                        accessibilityLabel={`Remove product ${product.id}`}
                      />
                    </HorizontalStack>
                  </div>
                </Card>
              ))}
            </VerticalStack>
          </VerticalStack>
        </Card>
      )}

      {/* Help Text and Error */}
      {helpText && (
        <Text variant="bodySm" color="subdued">
          {helpText}
        </Text>
      )}
      
      {error && (
        <InlineError message={error} fieldID={`product-selector-${label}`} />
      )}
    </VerticalStack>
  );
};

export default ProductSelector;