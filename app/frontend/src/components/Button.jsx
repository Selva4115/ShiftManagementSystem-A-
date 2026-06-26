import React from 'react';

const Button = ({ children, type = 'button', variant = 'primary', onClick, disabled, loading, style }) => {
  const getClassName = () => {
    switch (variant) {
      case 'primary': return 'btn btn-primary';
      case 'secondary': return 'btn btn-secondary';
      case 'danger': return 'btn btn-danger';
      case 'outline': return 'btn btn-outline';
      default: return 'btn';
    }
  };

  return (
    <button
      type={type}
      className={getClassName()}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading ? (
        <span style={spinnerStyle}></span>
      ) : children}
    </button>
  );
};

const spinnerStyle = {
  width: '18px',
  height: '18px',
  border: '2px solid transparent',
  borderTopColor: 'currentColor',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
};

// Inject custom keyframes for loading spinner dynamically if not defined
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleTag);

export default Button;
