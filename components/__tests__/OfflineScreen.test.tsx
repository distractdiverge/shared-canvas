import { render, screen } from '@testing-library/react';
import OfflineScreen from '../OfflineScreen';

describe('OfflineScreen', () => {
  it('renders the offline screen', () => {
    render(<OfflineScreen />);

    expect(screen.getByText("You're Currently Offline")).toBeInTheDocument();
  });

  it('displays the reconnection message', () => {
    render(<OfflineScreen />);

    expect(screen.getByText('Reconnect to continue drawing')).toBeInTheDocument();
  });

  it('renders an icon/svg', () => {
    const { container } = render(<OfflineScreen />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has correct styling for full-screen overlay', () => {
    const { container } = render(<OfflineScreen />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('fixed', 'inset-0', 'bg-white', 'z-50');
  });

  it('centers content on screen', () => {
    const { container } = render(<OfflineScreen />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
