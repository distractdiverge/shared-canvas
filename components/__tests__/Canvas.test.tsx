import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Canvas from '../Canvas';

describe('Canvas', () => {
  const mockOnStrokeComplete = jest.fn();
  const mockOnTextAdd = jest.fn();

  // Mock window.prompt
  const mockPrompt = jest.fn();
  global.prompt = mockPrompt;

  beforeEach(() => {
    mockOnStrokeComplete.mockClear();
    mockOnTextAdd.mockClear();
    mockPrompt.mockClear();

    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillStyle: '',
      fillRect: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      setTransform: jest.fn(),
    })) as any;
  });

  const defaultProps = {
    userColor: '#FF6B6B',
    tool: 'draw' as const,
    onStrokeComplete: mockOnStrokeComplete,
    onTextAdd: mockOnTextAdd,
  };

  it('renders a canvas element', () => {
    const { container } = render(<Canvas {...defaultProps} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('sets canvas size based on window dimensions', () => {
    const { container } = render(<Canvas {...defaultProps} />);

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(window.innerWidth);
    expect(canvas.height).toBe(window.innerHeight - 60); // Account for toolbar
  });

  it('has crosshair cursor when draw tool is selected', () => {
    const { container } = render(<Canvas {...defaultProps} tool="draw" />);

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.cursor).toBe('crosshair');
  });

  it('has text cursor when text tool is selected', () => {
    const { container } = render(<Canvas {...defaultProps} tool="text" />);

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.cursor).toBe('text');
  });

  it('has grab cursor when pan tool is selected', () => {
    const { container } = render(<Canvas {...defaultProps} tool="pan" />);

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.cursor).toBe('grab');
  });

  it('calls onStrokeComplete when drawing is finished', () => {
    const { container } = render(<Canvas {...defaultProps} tool="draw" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    // Simulate drawing
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 30 });
    fireEvent.pointerUp(canvas);

    expect(mockOnStrokeComplete).toHaveBeenCalledTimes(1);
    expect(mockOnStrokeComplete).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      ]),
      '#FF6B6B'
    );
  });

  it('does not call onStrokeComplete when tool is not draw', () => {
    const { container } = render(<Canvas {...defaultProps} tool="pan" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas);

    expect(mockOnStrokeComplete).not.toHaveBeenCalled();
  });

  it('prompts for text and calls onTextAdd when text tool is used', () => {
    mockPrompt.mockReturnValue('Hello World');

    const { container } = render(<Canvas {...defaultProps} tool="text" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });

    expect(mockPrompt).toHaveBeenCalledWith('Enter text:');
    expect(mockOnTextAdd).toHaveBeenCalledWith(
      'Hello World',
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      '#FF6B6B'
    );
  });

  it('does not call onTextAdd when text prompt is cancelled', () => {
    mockPrompt.mockReturnValue(null);

    const { container } = render(<Canvas {...defaultProps} tool="text" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });

    expect(mockPrompt).toHaveBeenCalledWith('Enter text:');
    expect(mockOnTextAdd).not.toHaveBeenCalled();
  });

  it('does not call onTextAdd when empty text is entered', () => {
    mockPrompt.mockReturnValue('');

    const { container } = render(<Canvas {...defaultProps} tool="text" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });

    expect(mockOnTextAdd).not.toHaveBeenCalled();
  });

  it('handles pan tool interactions without drawing', () => {
    const { container } = render(<Canvas {...defaultProps} tool="pan" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(mockOnStrokeComplete).not.toHaveBeenCalled();
    expect(mockOnTextAdd).not.toHaveBeenCalled();
  });

  it('stops drawing when pointer leaves canvas', () => {
    const { container } = render(<Canvas {...defaultProps} tool="draw" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerLeave(canvas);

    expect(mockOnStrokeComplete).toHaveBeenCalledTimes(1);
  });

  it('has touch-none class to prevent default touch behavior', () => {
    const { container } = render(<Canvas {...defaultProps} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    expect(canvas).toHaveClass('touch-none');
  });
});
