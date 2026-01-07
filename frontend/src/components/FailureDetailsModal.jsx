import React from 'react';
import Modal from './Modal';

const FailureDetailsModal = ({ isOpen, onClose, failedRecords }) => {
  if (!failedRecords || failedRecords.length === 0) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Failure Details">
      <div style={styles.summary}>
        <p style={styles.summaryText}>
          <strong>{failedRecords.length}</strong> record(s) failed to upload. See details below:
        </p>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.headerCellFirst}>Row in the Uploaded Excel</th>
              <th style={styles.headerCell}>Reason</th>
              <th style={styles.headerCellLast}>Impacted Data</th>
            </tr>
          </thead>
          <tbody>
            {failedRecords.map((record, index) => (
              <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                <td style={styles.cell}>{record.row || record.customerId || 'N/A'}</td>
                <td style={styles.reasonCell}>
                  <span style={getReasonStyle(record.reason)}>
                    {getReasonIcon(record.reason)} {record.reason}
                  </span>
                </td>
                <td style={styles.dataCell}>
                  {renderImpactedData(record.data)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

const renderImpactedData = (data) => {
  if (!data) return <em style={{ color: '#9ca3af' }}>No data available</em>;

  // Define field priority order for consistent display
  const fieldPriority = {
    'customerId': 1,
    'phoneNumber': 2,
    'campaignId': 3,
    'campaignName': 4,
    'uploadedBy': 5
  };

  // Filter out empty/null values and "empty" strings
  const validEntries = Object.entries(data).filter(([key, value]) => {
    return value !== null &&
           value !== undefined &&
           value !== '' &&
           value !== 'empty' &&
           String(value).trim() !== '';
  });

  if (validEntries.length === 0) {
    return <em style={{ color: '#9ca3af' }}>No data available</em>;
  }

  // Sort entries by priority (prioritized fields first, then alphabetically)
  const sortedEntries = validEntries.sort((a, b) => {
    const priorityA = fieldPriority[a[0]] || 999;
    const priorityB = fieldPriority[b[0]] || 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority (or both unprioritized), sort alphabetically
    return a[0].localeCompare(b[0]);
  });

  const displayEntries = sortedEntries.slice(0, 3);
  const remainingCount = sortedEntries.length - 3;

  return (
    <div style={styles.dataPreview}>
      {displayEntries.map(([key, value]) => (
        <div key={key} style={styles.dataItem}>
          <strong>{key}:</strong> {value}
        </div>
      ))}
      {remainingCount > 0 && (
        <div style={styles.moreData}>
          +{remainingCount} more field(s)
        </div>
      )}
    </div>
  );
};

const getReasonIcon = (reason) => {
  if (reason.toLowerCase().includes('duplicate')) return '🔄';
  if (reason.toLowerCase().includes('dnc')) return '🚫';
  if (reason.toLowerCase().includes('missing') || reason.toLowerCase().includes('required')) return '⚠️';
  if (reason.toLowerCase().includes('invalid') || reason.toLowerCase().includes('format')) return '❌';
  return '⚠️';
};

const getReasonStyle = (reason) => {
  const baseStyle = {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  if (reason.toLowerCase().includes('duplicate')) {
    return { ...baseStyle, background: '#fef3c7', color: '#92400e' };
  }
  if (reason.toLowerCase().includes('dnc')) {
    return { ...baseStyle, background: '#fee2e2', color: '#991b1b' };
  }
  if (reason.toLowerCase().includes('missing') || reason.toLowerCase().includes('required')) {
    return { ...baseStyle, background: '#fed7aa', color: '#9a3412' };
  }
  return { ...baseStyle, background: '#fee2e2', color: '#991b1b' };
};

const styles = {
  summary: {
    background: '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  summaryText: {
    margin: 0,
    fontSize: '16px',
    color: '#374151',
  },
  tableWrapper: {
    overflowX: 'auto',
    border: '2px solid #4d216d',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  headerRow: {
    background: '#4d216d',
    color: 'white',
    borderBottom: '2px solid #4d216d',
  },
  headerCell: {
    padding: '14px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerCellFirst: {
    padding: '14px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: '10px',
  },
  headerCellLast: {
    padding: '14px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    borderTopRightRadius: '10px',
  },
  evenRow: {
    background: '#ffffff',
  },
  oddRow: {
    background: '#f9fafb',
  },
  cell: {
    padding: '14px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    fontWeight: '600',
    color: '#6b7280',
  },
  reasonCell: {
    padding: '14px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
  },
  dataCell: {
    padding: '14px',
    borderBottom: '1px solid #e5e7eb',
  },
  dataPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dataItem: {
    fontSize: '13px',
    color: '#374151',
  },
  moreData: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '4px',
  },
};

export default FailureDetailsModal;
