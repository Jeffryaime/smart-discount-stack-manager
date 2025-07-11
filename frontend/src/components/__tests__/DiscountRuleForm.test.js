import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppProvider } from '@shopify/polaris';
import DiscountRuleForm from '../DiscountRuleForm';
import enTranslations from '@shopify/polaris/locales/en.json';

// Mock ProductSelector component
jest.mock('../ProductSelector', () => ({
  __esModule: true,
  default: ({ label, value, onChange, helpText, disabled }) => (
    <div data-testid="product-selector">
      <label>{label}</label>
      <input 
        type="text" 
        value={value.join(',')} 
        onChange={(e) => onChange(e.target.value.split(',').filter(Boolean))}
        disabled={disabled}
        data-testid={`product-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <span>{helpText}</span>
    </div>
  )
}));

const renderWithPolaris = (component) => {
  return render(
    <AppProvider i18n={enTranslations}>
      {component}
    </AppProvider>
  );
};

describe('DiscountRuleForm BOGO Feature Tests', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    discounts: [],
    onChange: mockOnChange,
    error: null
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('should render BOGO discount type option', () => {
    renderWithPolaris(<DiscountRuleForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Discount Rule'));
    
    const select = screen.getByLabelText('Discount Type');
    expect(select).toBeInTheDocument();
    
    // Check if BOGO option exists
    const options = screen.getAllByRole('option');
    const bogoOption = options.find(option => option.textContent === 'Buy X Get Y Free');
    expect(bogoOption).toBeInTheDocument();
  });

  test('should show BOGO specific options when BOGO type is selected', async () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    // Check for BOGO specific elements
    expect(screen.getByText('BOGO Specific Options')).toBeInTheDocument();
    expect(screen.getByText('Free Product Selection Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Use specific SKUs')).toBeInTheDocument();
    expect(screen.getByLabelText('Auto-discount cheapest eligible item')).toBeInTheDocument();
  });

  test('should toggle between specific and cheapest modes', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    const specificRadio = screen.getByLabelText('Use specific SKUs');
    const cheapestRadio = screen.getByLabelText('Auto-discount cheapest eligible item');
    
    expect(specificRadio).toBeChecked();
    expect(cheapestRadio).not.toBeChecked();
    
    // Click cheapest mode
    fireEvent.click(cheapestRadio);
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            freeProductMode: 'cheapest'
          })
        })
      ])
    );
  });

  test('should disable free products field when cheapest mode is selected', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'cheapest'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    const freeProductsInput = screen.getByTestId('product-selector-free-products-(get-y)');
    expect(freeProductsInput).toBeDisabled();
    
    // Check for the help text
    expect(screen.getByText('This field is ignored when auto-discounting cheapest item')).toBeInTheDocument();
  });

  test('should show info banner for cheapest mode', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['12345'],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'cheapest'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    // Check for info banner
    expect(screen.getByText('When using auto-discount mode, the system will:')).toBeInTheDocument();
    expect(screen.getByText('Select the cheapest product from Eligible Products only')).toBeInTheDocument();
    expect(screen.getByText('If items have the same price, prefer matching items (same SKU)')).toBeInTheDocument();
    expect(screen.getByText('Otherwise, select the lowest-priced unit')).toBeInTheDocument();
    expect(screen.getByText('Respect the Limit Per Order setting if configured')).toBeInTheDocument();
  });

  test('should handle buy and get quantity inputs', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    const buyQuantityInput = screen.getByLabelText('Buy Quantity (X)');
    const getQuantityInput = screen.getByLabelText('Get Quantity (Y)');
    
    expect(buyQuantityInput).toHaveValue(2);
    expect(getQuantityInput).toHaveValue(1);
    
    // Change buy quantity
    fireEvent.change(buyQuantityInput, { target: { value: '3' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            buyQuantity: 3
          })
        })
      ])
    );
  });

  test('should handle limit per order input', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    const limitInput = screen.getByLabelText('Limit Per Order');
    
    expect(limitInput).toHaveValue('');
    
    // Set limit
    fireEvent.change(limitInput, { target: { value: '5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            limitPerOrder: 5
          })
        })
      ])
    );
    
    // Clear limit
    fireEvent.change(limitInput, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            limitPerOrder: null
          })
        })
      ])
    );
  });

  test('should handle product selection for eligible and free products', () => {
    const discounts = [{
      id: '1',
      type: 'buy_x_get_y',
      value: 2,
      bogoConfig: {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      },
      conditions: {},
      priority: 0,
      isActive: true
    }];

    renderWithPolaris(<DiscountRuleForm {...defaultProps} discounts={discounts} />);
    
    const eligibleProductsInput = screen.getByTestId('product-selector-eligible-products-(buy-x)');
    const freeProductsInput = screen.getByTestId('product-selector-free-products-(get-y)');
    
    // Add eligible products
    fireEvent.change(eligibleProductsInput, { target: { value: '12345,67890' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            eligibleProductIds: ['12345', '67890']
          })
        })
      ])
    );
    
    // Add free products
    fireEvent.change(freeProductsInput, { target: { value: '11111,22222' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          bogoConfig: expect.objectContaining({
            freeProductIds: ['11111', '22222']
          })
        })
      ])
    );
  });

  test('should initialize new BOGO discount with default values', () => {
    renderWithPolaris(<DiscountRuleForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Discount Rule'));
    
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    const newDiscount = lastCall[lastCall.length - 1];
    
    expect(newDiscount).toMatchObject({
      type: 'percentage',
      value: 0,
      bogoConfig: {
        buyQuantity: 1,
        getQuantity: 1,
        eligibleProductIds: [],
        freeProductIds: [],
        limitPerOrder: null
      }
    });
  });
});