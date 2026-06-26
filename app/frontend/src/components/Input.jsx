import React from 'react';

const Input = ({ label, id, name, type = 'text', value, onChange, placeholder, options, required, error, rows }) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          {label} {required && <span style={{ color: 'var(--danger-color)' }}>*</span>}
        </label>
      )}
      
      {type === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="form-control"
          required={required}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options && options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="form-control"
          required={required}
          rows={rows || 3}
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="form-control"
          required={required}
        />
      )}
      
      {error && (
        <span style={errorStyle}>
          {error}
        </span>
      )}
    </div>
  );
};

const errorStyle = {
  fontSize: '0.75rem',
  color: 'var(--danger-color)',
  marginTop: '0.25rem',
  fontWeight: '500',
};

export default Input;
