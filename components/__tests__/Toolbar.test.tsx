import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../Toolbar';

describe('Toolbar', () => {
  const mockOnToolChange = jest.fn();
  const mockOnZoomIn = jest.fn();
  const mockOnZoomOut = jest.fn();
  const mockOnResetView = jest.fn();

  beforeEach(() => {
    mockOnToolChange.mockClear();
    mockOnZoomIn.mockClear();
    mockOnZoomOut.mockClear();
    mockOnResetView.mockClear();
  });

  const defaultProps = {
    selectedTool: 'draw' as const,
    onToolChange: mockOnToolChange,
    onZoomIn: mockOnZoomIn,
    onZoomOut: mockOnZoomOut,
    onResetView: mockOnResetView,
  };

  it('renders all tool buttons', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByText('Draw')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Pan')).toBeInTheDocument();
  });

  it('renders zoom control buttons', () => {
    render(<Toolbar {...defaultProps} />);

    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
  });

  it('highlights the selected tool', () => {
    render(<Toolbar {...defaultProps} selectedTool="draw" />);

    const drawButton = screen.getByText('Draw');
    expect(drawButton).toHaveClass('bg-blue-500', 'text-white');
  });

  it('does not highlight unselected tools', () => {
    render(<Toolbar {...defaultProps} selectedTool="draw" />);

    const textButton = screen.getByText('Text');
    const panButton = screen.getByText('Pan');

    expect(textButton).toHaveClass('bg-gray-100', 'text-gray-700');
    expect(panButton).toHaveClass('bg-gray-100', 'text-gray-700');
  });

  it('calls onToolChange when draw button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} selectedTool="text" />);

    const drawButton = screen.getByText('Draw');
    await user.click(drawButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('draw');
  });

  it('calls onToolChange when text button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} selectedTool="draw" />);

    const textButton = screen.getByText('Text');
    await user.click(textButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('text');
  });

  it('calls onToolChange when pan button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} selectedTool="draw" />);

    const panButton = screen.getByText('Pan');
    await user.click(panButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('pan');
  });

  it('calls onZoomIn when zoom in button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    const zoomInButton = screen.getByLabelText('Zoom in');
    await user.click(zoomInButton);

    expect(mockOnZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    const zoomOutButton = screen.getByLabelText('Zoom out');
    await user.click(zoomOutButton);

    expect(mockOnZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onResetView when reset view button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    const resetButton = screen.getByLabelText('Reset view');
    await user.click(resetButton);

    expect(mockOnResetView).toHaveBeenCalledTimes(1);
  });

  it('updates highlighted tool when selectedTool prop changes', () => {
    const { rerender } = render(<Toolbar {...defaultProps} selectedTool="draw" />);

    expect(screen.getByText('Draw')).toHaveClass('bg-blue-500');
    expect(screen.getByText('Text')).toHaveClass('bg-gray-100');

    rerender(<Toolbar {...defaultProps} selectedTool="text" />);

    expect(screen.getByText('Draw')).toHaveClass('bg-gray-100');
    expect(screen.getByText('Text')).toHaveClass('bg-blue-500');
  });

  it('renders with proper toolbar styling', () => {
    const { container } = render(<Toolbar {...defaultProps} />);

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
  });
});
