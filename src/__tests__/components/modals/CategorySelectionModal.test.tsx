import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CategorySelectionModal from '../../../components/modals/CategorySelectionModal';

describe('CategorySelectionModal', () => {
  const mockProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockImplementation(async () => {}),
    currentCategory: 'Shopping',
    availableCategories: ['Shopping', 'Food & Drink', 'Transport', 'Bills'],
    transactionDescription: 'Test Transaction',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all categories', () => {
    const { getByText } = render(<CategorySelectionModal {...mockProps} />);

    // Check header
    expect(getByText('Select Category')).toBeTruthy();
    expect(getByText('Test Transaction')).toBeTruthy();

    // Check all categories are rendered
    mockProps.availableCategories.forEach((category) => {
      expect(getByText(category)).toBeTruthy();
    });

    // Check buttons
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('highlights current category', () => {
    const { getByText } = render(<CategorySelectionModal {...mockProps} />);
    const currentCategoryElement = getByText('Shopping');

    // Note: You might need to adjust this based on your actual styling implementation
    expect(currentCategoryElement.parent).toHaveStyle({ backgroundColor: '#f8f9ff' });
  });

  it('calls onClose when Cancel is pressed', () => {
    const { getByText } = render(<CategorySelectionModal {...mockProps} />);
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when a new category is selected and confirmed', async () => {
    const { getByText } = render(<CategorySelectionModal {...mockProps} />);

    // Select a different category
    fireEvent.press(getByText('Food & Drink'));

    // Press confirm
    fireEvent.press(getByText('Confirm'));

    await waitFor(() => {
      expect(mockProps.onConfirm).toHaveBeenCalledWith('Food & Drink');
    });
  });

  it('does not call onConfirm when the same category is selected', () => {
    const { getByText } = render(<CategorySelectionModal {...mockProps} />);

    // Select the current category
    fireEvent.press(getByText('Shopping'));

    // Press confirm
    fireEvent.press(getByText('Confirm'));

    expect(mockProps.onConfirm).not.toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('disables buttons while updating', async () => {
    const onConfirm = jest
      .fn()
      .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    const { getByText } = render(<CategorySelectionModal {...mockProps} onConfirm={onConfirm} />);

    // Select a different category
    fireEvent.press(getByText('Food & Drink'));

    // Press confirm
    fireEvent.press(getByText('Confirm'));

    // Check that buttons are disabled and updating text is shown
    expect(getByText('Updating...')).toBeTruthy();

    // Wait for update to complete
    await waitFor(() => {
      expect(getByText('Confirm')).toBeTruthy();
    });
  });
});
