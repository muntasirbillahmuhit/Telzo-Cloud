import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export const PlaneIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M21.9 3.2 2.6 10.6c-.9.4-.9 1.1-.2 1.3l4.9 1.5 1.9 5.8c.2.6.4.8.9.8s.7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.2-15.2c.3-1.2-.4-1.8-1.4-1.6zM8.5 12.9l9.4-5.9c.4-.3.8-.1.5.2l-7.8 7-.3 3.3-1.8-4.6z" />
  </svg>
);
