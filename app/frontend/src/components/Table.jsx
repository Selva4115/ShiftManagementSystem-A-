import React from 'react';
import { FileSearch } from 'lucide-react';

const Table = ({ headers, children, isEmpty, emptyMessage, emptyIcon }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length}>
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <div className="empty-state-icon">
                    {emptyIcon || <FileSearch size={40} color="var(--text-muted)" />}
                  </div>
                  <div className="empty-state-title">No records found</div>
                  <div className="empty-state-desc">{emptyMessage || 'Try adjusting your filters or search term.'}</div>
                </div>
              </td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
