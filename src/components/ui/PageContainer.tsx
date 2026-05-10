
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  maxWidth = 'lg',
  className = ''
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className={`mx-auto px-4 py-8 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};

export default PageContainer;
