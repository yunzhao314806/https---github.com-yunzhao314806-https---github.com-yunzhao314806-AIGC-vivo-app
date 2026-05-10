
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'default' | 'withText';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'default', className = '' }) => {
  return (
    <Link to="/" className={`inline-flex items-center ${className}`}>
      <div className="flex items-center">
        <span className="text-3xl font-bold text-stages-dark">实习</span>
        <span className="text-3xl font-bold text-stages-blue">中国</span>
        {variant === 'withText' && (
          <div className="relative ml-2">
            <div className="w-6 h-4 bg-stages-blue rounded-sm"></div>
            <div className="absolute top-1 left-2 w-2 h-2 bg-white rounded-full"></div>
            <div className="absolute top-0 right-0 border-t-2 border-r-2 border-stages-blue w-3 h-3 transform rotate-45 translate-x-1 -translate-y-1"></div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default Logo;
