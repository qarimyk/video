import React from 'react';

interface DotMatrixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DotMatrixLogo: React.FC<DotMatrixLogoProps> = ({ size = 'md', className = '' }) => {
  const dotSize = size === 'sm' ? 'w-1 h-1' : size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  const gapSize = size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-1.5' : 'gap-1.5';

  return (
    <div 
      className={`grid grid-cols-3 ${gapSize} p-1 items-center justify-center select-none ${className}`}
      title="Nothing CMF Design"
    >
      {[...Array(9)].map((_, i) => (
        <span 
          key={i} 
          className={`${dotSize} rounded-full ${
            i === 4 ? 'bg-black' : 'bg-neutral-900'
          } transition-transform hover:scale-125 duration-150`}
        />
      ))}
    </div>
  );
};
