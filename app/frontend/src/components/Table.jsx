import React from 'react';

const Table = ({ headers, children, isEmpty, emptyMessage }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} style={emptyStyle}>
                {emptyMessage || 'No matching records found.'}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
};

const emptyStyle = {
  textAlign: 'center',
  color: 'var(--text-muted)',
  padding: '3rem 0',
  fontSize: '1rem',
};

export default Table;
