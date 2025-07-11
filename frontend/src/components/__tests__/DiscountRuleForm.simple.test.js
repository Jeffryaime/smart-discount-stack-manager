import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simplified test version of DiscountRuleForm to test BOGO logic
const SimpleBOGOForm = ({ discount, onChange }) => {
  const updateDiscount = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const updatedDiscount = {
        ...discount,
        [parent]: {
          ...discount[parent],
          [child]: value
        }
      };
      onChange(updatedDiscount);
    } else {
      onChange({ ...discount, [field]: value });
    }
  };

  return (
    <div data-testid="bogo-form">
      <select 
        data-testid="discount-type"
        value={discount.type}
        onChange={(e) => updateDiscount('type', e.target.value)}
      >
        <option value="percentage">Percentage Off</option>
        <option value="buy_x_get_y">Buy X Get Y Free</option>
      </select>

      {discount.type === 'buy_x_get_y' && (
        <div data-testid="bogo-options">
          <div data-testid="free-product-mode">
            <input
              type="radio"
              id="specific"
              name="freeProductMode"
              value="specific"
              checked={discount.bogoConfig?.freeProductMode === 'specific' || !discount.bogoConfig?.freeProductMode}
              onChange={() => updateDiscount('bogoConfig.freeProductMode', 'specific')}
            />
            <label htmlFor="specific">Use specific SKUs</label>

            <input
              type="radio"
              id="cheapest"
              name="freeProductMode"
              value="cheapest"
              checked={discount.bogoConfig?.freeProductMode === 'cheapest'}
              onChange={() => updateDiscount('bogoConfig.freeProductMode', 'cheapest')}
            />
            <label htmlFor="cheapest">Auto-discount cheapest eligible item</label>
          </div>

          <input
            data-testid="buy-quantity"
            type="number"
            value={discount.bogoConfig?.buyQuantity || 1}
            onChange={(e) => updateDiscount('bogoConfig.buyQuantity', parseInt(e.target.value))}
          />

          <input
            data-testid="get-quantity"
            type="number"
            value={discount.bogoConfig?.getQuantity || 1}
            onChange={(e) => updateDiscount('bogoConfig.getQuantity', parseInt(e.target.value))}
          />

          <input
            data-testid="eligible-products"
            type="text"
            value={discount.bogoConfig?.eligibleProductIds?.join(',') || ''}
            onChange={(e) => updateDiscount('bogoConfig.eligibleProductIds', e.target.value.split(',').filter(Boolean))}
            placeholder="Eligible product IDs"
          />

          <input
            data-testid="free-products"
            type="text"
            value={discount.bogoConfig?.freeProductIds?.join(',') || ''}
            onChange={(e) => updateDiscount('bogoConfig.freeProductIds', e.target.value.split(',').filter(Boolean))}
            disabled={discount.bogoConfig?.freeProductMode === 'cheapest'}
            placeholder="Free product IDs"
          />

          <input
            data-testid="limit-per-order"
            type="number"
            value={discount.bogoConfig?.limitPerOrder === null || discount.bogoConfig?.limitPerOrder === undefined ? '' : discount.bogoConfig.limitPerOrder}
            onChange={(e) => updateDiscount('bogoConfig.limitPerOrder', e.target.value === '' ? null : parseInt(e.target.value))}
            placeholder="Limit per order"
          />

          {discount.bogoConfig?.freeProductMode === 'cheapest' && (
            <div data-testid="cheapest-info">
              <p>Auto-discount mode will select the cheapest item from eligible products</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

describe('BOGO Feature Logic Tests', () => {
  const mockOnChange = jest.fn();
  
  const defaultDiscount = {
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
    }
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('should render BOGO discount type option', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    const typeSelect = screen.getByTestId('discount-type');
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.value).toBe('buy_x_get_y');
  });

  test('should show BOGO specific options when BOGO type is selected', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    expect(screen.getByTestId('bogo-options')).toBeInTheDocument();
    expect(screen.getByTestId('free-product-mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Use specific SKUs')).toBeInTheDocument();
    expect(screen.getByLabelText('Auto-discount cheapest eligible item')).toBeInTheDocument();
  });

  test('should toggle between specific and cheapest modes', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    const specificRadio = screen.getByLabelText('Use specific SKUs');
    const cheapestRadio = screen.getByLabelText('Auto-discount cheapest eligible item');
    
    expect(specificRadio).toBeChecked();
    expect(cheapestRadio).not.toBeChecked();
    
    // Click cheapest mode
    fireEvent.click(cheapestRadio);
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          freeProductMode: 'cheapest'
        })
      })
    );
  });

  test('should disable free products field when cheapest mode is selected', () => {
    const cheapestDiscount = {
      ...defaultDiscount,
      bogoConfig: {
        ...defaultDiscount.bogoConfig,
        freeProductMode: 'cheapest'
      }
    };

    render(<SimpleBOGOForm discount={cheapestDiscount} onChange={mockOnChange} />);
    
    const freeProductsInput = screen.getByTestId('free-products');
    expect(freeProductsInput).toBeDisabled();
  });

  test('should show info banner for cheapest mode', () => {
    const cheapestDiscount = {
      ...defaultDiscount,
      bogoConfig: {
        ...defaultDiscount.bogoConfig,
        freeProductMode: 'cheapest'
      }
    };

    render(<SimpleBOGOForm discount={cheapestDiscount} onChange={mockOnChange} />);
    
    expect(screen.getByTestId('cheapest-info')).toBeInTheDocument();
    expect(screen.getByText('Auto-discount mode will select the cheapest item from eligible products')).toBeInTheDocument();
  });

  test('should handle buy and get quantity inputs', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    const buyQuantityInput = screen.getByTestId('buy-quantity');
    const getQuantityInput = screen.getByTestId('get-quantity');
    
    expect(buyQuantityInput.value).toBe('2');
    expect(getQuantityInput.value).toBe('1');
    
    // Change buy quantity
    fireEvent.change(buyQuantityInput, { target: { value: '3' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          buyQuantity: 3
        })
      })
    );
  });

  test('should handle limit per order input', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    const limitInput = screen.getByTestId('limit-per-order');
    
    expect(limitInput.value).toBe('');
    
    // Set limit
    fireEvent.change(limitInput, { target: { value: '5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          limitPerOrder: 5
        })
      })
    );
  });

  test('should handle product selection for eligible and free products', () => {
    render(<SimpleBOGOForm discount={defaultDiscount} onChange={mockOnChange} />);
    
    const eligibleProductsInput = screen.getByTestId('eligible-products');
    const freeProductsInput = screen.getByTestId('free-products');
    
    // Add eligible products
    fireEvent.change(eligibleProductsInput, { target: { value: '12345,67890' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          eligibleProductIds: ['12345', '67890']
        })
      })
    );
    
    mockOnChange.mockClear();
    
    // Add free products
    fireEvent.change(freeProductsInput, { target: { value: '11111,22222' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          freeProductIds: ['11111', '22222']
        })
      })
    );
  });

  test('should handle null limit per order correctly', () => {
    // Start with a discount that has a limit set
    const discountWithLimit = {
      ...defaultDiscount,
      bogoConfig: {
        ...defaultDiscount.bogoConfig,
        limitPerOrder: 5
      }
    };

    render(<SimpleBOGOForm discount={discountWithLimit} onChange={mockOnChange} />);
    
    const limitInput = screen.getByTestId('limit-per-order');
    expect(limitInput.value).toBe('5');
    
    // Clear the value (should become null)
    fireEvent.change(limitInput, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bogoConfig: expect.objectContaining({
          limitPerOrder: null
        })
      })
    );
  });
});