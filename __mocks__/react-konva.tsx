// Mock react-konva for Jest tests
import React from 'react';

export const Stage = React.forwardRef<any, any>(({ children, ...props }, ref) => (
  <div data-testid="konva-stage" ref={ref} {...props}>
    {children}
  </div>
));
Stage.displayName = 'Stage';

export const Layer: React.FC<any> = ({ children }) => (
  <div data-testid="konva-layer">{children}</div>
);

export const Line: React.FC<any> = (props) => (
  <div data-testid="konva-line" data-points={props.points} />
);

export const Text: React.FC<any> = (props) => (
  <div data-testid="konva-text">{props.text}</div>
);
