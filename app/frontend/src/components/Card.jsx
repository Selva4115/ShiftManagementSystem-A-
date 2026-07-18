import React from 'react';

const Card = ({ title, children, extra, style, className = '', onClick }) => {
  return (
    <div
      className={`card ${className}`}
      style={style}
      onClick={onClick}
    >
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {extra && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{extra}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;
