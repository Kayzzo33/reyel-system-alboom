
import { COLORS } from '../../constants';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-black rounded-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] relative overflow-hidden group';
  
  const variants = {
    primary: `bg-[#ff0000] text-white hover:brightness-110 shadow-lg shadow-red-900/20`,
    secondary: 'bg-slate-800 text-white hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white',
    outline: `border border-white/20 text-white hover:bg-white hover:text-black hover:border-white`,
    premium: `bg-transparent border border-red-600/50 text-white hover:border-red-600 hover:shadow-[0_0_30px_rgba(255,0,0,0.3)] backdrop-blur-md`
  };

  const sizes = {
    sm: 'px-4 py-2 text-[9px]',
    md: 'px-6 py-3 text-[10px]',
    lg: 'px-10 py-5 text-[12px]'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Efeito de brilho para variante premium */}
      {variant === 'premium' && (
        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000"></div>
      )}
      
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;
