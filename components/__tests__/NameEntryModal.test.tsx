import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NameEntryModal from '../NameEntryModal';
import { COLOR_PALETTE, MAX_NAME_LENGTH } from '@/lib/constants';

describe('NameEntryModal', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders the modal with title and description', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Welcome to Shared Canvas')).toBeInTheDocument();
    expect(screen.getByText('Enter your name and choose a color to start drawing')).toBeInTheDocument();
  });

  it('renders name input field', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('renders all colors from the palette', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    COLOR_PALETTE.forEach(color => {
      const colorButton = screen.getByLabelText(`Select color ${color}`);
      expect(colorButton).toBeInTheDocument();
      expect(colorButton).toHaveStyle({ backgroundColor: color });
    });
  });

  it('shows character count', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    expect(screen.getByText(`Your Name (0/${MAX_NAME_LENGTH})`)).toBeInTheDocument();
  });

  it('updates character count when typing', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Alice');

    expect(screen.getByText(`Your Name (5/${MAX_NAME_LENGTH})`)).toBeInTheDocument();
  });

  it('prevents input beyond max length', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
    const longName = 'a'.repeat(MAX_NAME_LENGTH + 10);

    await user.type(input, longName);

    expect(input.value.length).toBe(MAX_NAME_LENGTH);
  });

  it('selects first color by default', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const firstColorButton = screen.getByLabelText(`Select color ${COLOR_PALETTE[0]}`);
    expect(firstColorButton).toHaveClass('ring-4', 'ring-blue-500');
  });

  it('allows color selection', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const secondColor = COLOR_PALETTE[1];
    const colorButton = screen.getByLabelText(`Select color ${secondColor}`);

    await user.click(colorButton);

    expect(colorButton).toHaveClass('ring-4', 'ring-blue-500');
  });

  it('disables submit button when name is empty', () => {
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText('Start Drawing');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is entered', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Alice');

    const submitButton = screen.getByText('Start Drawing');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with name and selected color when form is submitted', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Alice');

    const submitButton = screen.getByText('Start Drawing');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Alice', COLOR_PALETTE[0]);
  });

  it('calls onSubmit with selected color when changed', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, 'Bob');

    const thirdColor = COLOR_PALETTE[2];
    const colorButton = screen.getByLabelText(`Select color ${thirdColor}`);
    await user.click(colorButton);

    const submitButton = screen.getByText('Start Drawing');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Bob', thirdColor);
  });

  it('trims whitespace from name before submitting', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, '  Alice  ');

    const submitButton = screen.getByText('Start Drawing');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Alice', COLOR_PALETTE[0]);
  });

  it('does not submit when name is only whitespace', async () => {
    const user = userEvent.setup();
    render(<NameEntryModal onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('Enter your name');
    await user.type(input, '   ');

    // Submit button should still be disabled
    const submitButton = screen.getByText('Start Drawing');
    expect(submitButton).toBeDisabled();
  });
});
