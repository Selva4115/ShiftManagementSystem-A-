import React from 'react';

const Card = ({ title, children, extra, style }) => {
  return (
    <div className="card" style={{ ...cardStyle, ...style }}>
      {title && (
        <div className="card-header" style={headerStyle}>
          <h3 className="card-title">{title}</h3>
          {extra && <div style={extraStyle}>{extra}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

const cardStyle = {
  marginBottom: '1rem',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '0.75rem',
  marginBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
};

const extraStyle = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
};

export default Card;
