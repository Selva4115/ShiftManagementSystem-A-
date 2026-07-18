import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({ label, id, name, type = 'text', value, onChange, placeholder, options, required, error, rows }) => {
  const [showPwd, setShowPwd] = useState(false);

  const inputType = type === 'password' ? (showPwd ? 'text' : 'password') : type;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span style={{ color: 'var(--danger-color)', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select id={id} name={name} value={value} onChange={onChange} className="form-control" required={required}>
          {placeholder && <option value="">{placeholder}</option>}
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

      ) : type === 'textarea' ? (
        <textarea
          id={id} name={name} value={value} onChange={onChange}
          placeholder={placeholder} className="form-control"
          required={required} rows={rows || 3}
          style={{ resize: 'vertical', minHeight: '80px' }}
        />

      ) : type === 'password' ? (
        <div className="password-input-container">
          <input
            type={inputType} id={id} name={name} value={value}
            onChange={onChange} placeholder={placeholder}
            className="form-control" required={required}
            style={{ paddingRight: '2.5rem' }}
          />
          <button type="button" className="password-toggle-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

      ) : (
        <input
          type={inputType} id={id} name={name} value={value}
          onChange={onChange} placeholder={placeholder}
          className="form-control" required={required}
        />
      )}

      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', marginTop: '0.25rem', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
