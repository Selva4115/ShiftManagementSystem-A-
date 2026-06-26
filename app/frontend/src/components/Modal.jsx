import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} className="fade-in">
        <div style={headerStyle}>
          <h3 style={titleStyle}>{title || 'Details'}</h3>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>
        <div style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)', // Dark slate overlay
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--border-radius)',
  width: '100%',
  maxWidth: '550px',
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid var(--border-color)',
};

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '0.25rem',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    backgroundColor: 'var(--bg-color)',
  }
};

const bodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
};

export default Modal;
