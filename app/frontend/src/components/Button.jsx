import React from 'react';

const Button = ({ children, type = 'button', variant = 'primary', size, onClick, disabled, loading, style, className = '' }) => {
  const cls = [
    'btn',
    `btn-${variant}`,
    size ? `btn-${size}` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading ? (
        <span style={{
          width: '16px', height: '16px',
          border: '2px solid transparent',
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.6s linear infinite',
          flexShrink: 0
        }} />
      ) : children}
    </button>
  );
};

export default Button;
