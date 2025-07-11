import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import UnifiedProductSelector from '../components/UnifiedProductSelector';

// Mock API service
jest.mock('../services/api', () => ({
  getCollections: jest.fn(),
  searchCollections: jest.fn(),
  getVariants: jest.fn(),
  searchVariants: jest.fn(),
  getFilterMetadata: jest.fn()
}));

import * as api from '../services/api';

// Mock Shopify Polaris components
jest.mock('@shopify/polaris', () => {
  const actual = jest.requireActual('@shopify/polaris');
  return {
    ...actual,
    ResourceList: ({ children, ...props }) => (
      <div data-testid="resource-list" {...props}>{children}</div>
    ),
    ResourceItem: ({ children, ...props }) => (
      <div data-testid="resource-item" {...props}>{children}</div>
    ),
    Filters: ({ children, filters, onQueryChange, onClearAll, ...props }) => (
      <div data-testid="filters" {...props}>
        <input 
          data-testid="filter-query" 
          onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
          placeholder="Search..."
        />
        <button data-testid="clear-filters" onClick={onClearAll}>Clear</button>
        {children}
      </div>
    ),
    ChoiceList: ({ choices, selected, onChange, ...props }) => (
      <div data-testid="choice-list" {...props}>
        {choices.map((choice, index) => (
          <label key={index}>
            <input
              type="checkbox"
              checked={selected.includes(choice.value)}
              onChange={() => {
                const newSelected = selected.includes(choice.value)
                  ? selected.filter(v => v !== choice.value)
                  : [...selected, choice.value];
                onChange(newSelected);
              }}
            />
            {choice.label}
          </label>
        ))}
      </div>
    )
  };
});

describe('UnifiedProductSelector', () => {
  let queryClient;
  const mockOnSelectionChange = jest.fn();

  const mockCollections = [
    {
      id: 'gid://shopify/Collection/1',
      handle: 'shirts',
      title: 'Shirts Collection',
      productsCount: 15
    },
    {
      id: 'gid://shopify/Collection/2',
      handle: 'premium',
      title: 'Premium Products',
      productsCount: 8
    }
  ];

  const mockVariants = [
    {
      id: 'gid://shopify/ProductVariant/123',
      title: 'Basic T-Shirt - Small',
      sku: 'SHIRT-S-001',
      price: '19.99',
      inventoryQuantity: 50,
      product: {
        id: 'gid://shopify/Product/1',
        title: 'Basic T-Shirt',
        vendor: 'TestBrand',
        productType: 'Apparel',
        status: 'ACTIVE',
        isGiftCard: false
      }
    },
    {
      id: 'gid://shopify/ProductVariant/456',
      title: 'Premium Hoodie - Medium',
      sku: 'HOODIE-M-002',
      price: '59.99',
      inventoryQuantity: 25,
      product: {
        id: 'gid://shopify/Product/2',
        title: 'Premium Hoodie',
        vendor: 'PremiumBrand',
        productType: 'Apparel',
        status: 'ACTIVE',
        isGiftCard: false
      }
    }
  ];

  const mockFilterMetadata = {
    vendors: ['TestBrand', 'PremiumBrand', 'BudgetBrand'],
    productTypes: ['Apparel', 'Accessories', 'Electronics']
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset mocks
    jest.clearAllMocks();
    mockOnSelectionChange.mockClear();

    // Setup default API responses
    api.getCollections.mockResolvedValue(mockCollections);
    api.searchCollections.mockResolvedValue(mockCollections.slice(0, 1));
    api.getVariants.mockResolvedValue(mockVariants);
    api.searchVariants.mockResolvedValue(mockVariants.slice(0, 1));
    api.getFilterMetadata.mockResolvedValue(mockFilterMetadata);
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedProductSelector
          onSelectionChange={mockOnSelectionChange}
          selectedItems={[]}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Tab Navigation', () => {
    it('should render all three tabs', () => {
      renderComponent();

      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Collections')).toBeInTheDocument();
      expect(screen.getByText('SKUs')).toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      renderComponent();

      // Start on Products tab
      expect(screen.getByText('Products')).toHaveAttribute('aria-selected', 'true');
      
      // Switch to Collections tab
      fireEvent.click(screen.getByText('Collections'));
      expect(screen.getByText('Collections')).toHaveAttribute('aria-selected', 'true');
      
      // Switch to SKUs tab
      fireEvent.click(screen.getByText('SKUs'));
      expect(screen.getByText('SKUs')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Gift Card Handling', () => {
    it('should show gift card exclusion banner when gift cards are present', async () => {
      const variantsWithGiftCard = [
        ...mockVariants,
        {
          id: 'gid://shopify/ProductVariant/999',
          title: 'Gift Card - $50',
          sku: 'GIFT-50',
          price: '50.00',
          inventoryQuantity: 999,
          product: {
            id: 'gid://shopify/Product/999',
            title: 'Gift Card',
            vendor: 'Store',
            productType: 'Gift Card',
            status: 'ACTIVE',
            isGiftCard: true
          }
        }
      ];

      api.getVariants.mockResolvedValue(variantsWithGiftCard);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/gift cards are automatically excluded/i)).toBeInTheDocument();
      });
    });

    it('should filter out gift cards from selection', async () => {
      const variantsWithGiftCard = [
        ...mockVariants,
        {
          id: 'gid://shopify/ProductVariant/999',
          title: 'Gift Card - $50',
          sku: 'GIFT-50',
          price: '50.00',
          inventoryQuantity: 999,
          product: {
            id: 'gid://shopify/Product/999',
            title: 'Gift Card',
            vendor: 'Store',
            productType: 'Gift Card',
            status: 'ACTIVE',
            isGiftCard: true
          }
        }
      ];

      api.getVariants.mockResolvedValue(variantsWithGiftCard);

      renderComponent();

      await waitFor(() => {
        // Should only show non-gift card products
        expect(screen.getByText('Basic T-Shirt - Small')).toBeInTheDocument();
        expect(screen.getByText('Premium Hoodie - Medium')).toBeInTheDocument();
        expect(screen.queryByText('Gift Card - $50')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering System', () => {
    it('should apply search filter correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('filter-query')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('filter-query');
      fireEvent.change(searchInput, { target: { value: 'shirt' } });

      await waitFor(() => {
        expect(api.searchVariants).toHaveBeenCalledWith('shirt');
      });
    });

    it('should show active filter chips', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('filters')).toBeInTheDocument();
      });

      // Apply vendor filter
      const vendorCheckbox = screen.getByLabelText('TestBrand');
      fireEvent.click(vendorCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Vendor: TestBrand')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
      });

      // Apply some filters first
      const vendorCheckbox = screen.getByLabelText('TestBrand');
      fireEvent.click(vendorCheckbox);

      // Clear all filters
      fireEvent.click(screen.getByTestId('clear-filters'));

      await waitFor(() => {
        expect(screen.queryByText('Vendor: TestBrand')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bulk Selection', () => {
    it('should show bulk selection controls when items are filtered', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('filter-query')).toBeInTheDocument();
      });

      // Apply a filter
      const searchInput = screen.getByTestId('filter-query');
      fireEvent.change(searchInput, { target: { value: 'shirt' } });

      await waitFor(() => {
        expect(screen.getByText(/select all filtered results/i)).toBeInTheDocument();
      });
    });

    it('should select all filtered items when bulk select is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('filter-query')).toBeInTheDocument();
      });

      // Apply a filter
      const searchInput = screen.getByTestId('filter-query');
      fireEvent.change(searchInput, { target: { value: 'shirt' } });

      await waitFor(() => {
        const bulkSelectButton = screen.getByText(/select all filtered results/i);
        fireEvent.click(bulkSelectButton);
      });

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });
    });
  });

  describe('Item Selection', () => {
    it('should handle individual item selection', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Basic T-Shirt - Small')).toBeInTheDocument();
      });

      // Click on an item to select it
      const firstItem = screen.getByText('Basic T-Shirt - Small');
      fireEvent.click(firstItem);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([mockVariants[0].id]);
    });

    it('should show selected items count', () => {
      const selectedItems = [mockVariants[0].id, mockVariants[1].id];
      renderComponent({ selectedItems });

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should handle deselection of items', async () => {
      const selectedItems = [mockVariants[0].id];
      renderComponent({ selectedItems });

      await waitFor(() => {
        expect(screen.getByText('Basic T-Shirt - Small')).toBeInTheDocument();
      });

      // Click on selected item to deselect
      const selectedItem = screen.getByText('Basic T-Shirt - Small');
      fireEvent.click(selectedItem);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      api.getVariants.mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should handle empty results', async () => {
      api.getVariants.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('filter-query')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('filter-query');
      
      // Type quickly
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });

      // Should only make one API call after debounce delay
      await waitFor(() => {
        expect(api.searchVariants).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Collections Tab', () => {
    it('should load and display collections', async () => {
      renderComponent();

      // Switch to Collections tab
      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByText('Shirts Collection')).toBeInTheDocument();
        expect(screen.getByText('Premium Products')).toBeInTheDocument();
      });
    });

    it('should show collection product counts', async () => {
      renderComponent();

      fireEvent.click(screen.getByText('Collections'));

      await waitFor(() => {
        expect(screen.getByText('15 products')).toBeInTheDocument();
        expect(screen.getByText('8 products')).toBeInTheDocument();
      });
    });
  });

  describe('SKUs Tab', () => {
    it('should display SKU information', async () => {
      renderComponent();

      // Switch to SKUs tab
      fireEvent.click(screen.getByText('SKUs'));

      await waitFor(() => {
        expect(screen.getByText('SHIRT-S-001')).toBeInTheDocument();
        expect(screen.getByText('HOODIE-M-002')).toBeInTheDocument();
      });
    });

    it('should show inventory information', async () => {
      renderComponent();

      fireEvent.click(screen.getByText('SKUs'));

      await waitFor(() => {
        expect(screen.getByText('50 in stock')).toBeInTheDocument();
        expect(screen.getByText('25 in stock')).toBeInTheDocument();
      });
    });
  });
});