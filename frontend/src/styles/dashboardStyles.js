export const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    paddingTop: '50px' // Account for fixed header
  },
  header: {
    background: 'linear-gradient(135deg, #4D216D 0%, #6d3a8f 100%)',
    padding: '20px 40px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  headerIcon: {
    fontSize: '32px'
  },
  headerTitle: {
    color: 'white',
    margin: 0,
    fontSize: '24px',
    fontWeight: '700'
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
    fontSize: '13px',
    fontWeight: '400'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userInfo: {
    color: 'white',
    fontSize: '15px'
  },
  logoutBtn: {
    background: '#e11d48',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '40px',
    gap: '12px'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  stepCircle: (active) => ({
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    background: active ? 'linear-gradient(135deg, #4D216D 0%, #6d3a8f 100%)' : '#e5e7eb',
    color: active ? 'white' : '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    boxShadow: active ? '0 4px 12px rgba(77,33,109,0.3)' : 'none'
  }),
  stepLabel: (active) => ({
    fontSize: '12px',
    fontWeight: active ? '600' : '500',
    color: active ? '#1f2937' : '#9ca3af',
    textAlign: 'center',
    maxWidth: '80px'
  }),
  connector: {
    width: '40px',
    height: '3px',
    background: '#e5e7eb',
    marginTop: '-20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  section: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  inputGroup: {
    display: 'flex',
    gap: '12px'
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    outline: 'none'
  },
  button: {
    padding: '12px 24px',
    background: '#4D216D',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  infoBox: {
    background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    border: '2px solid #c084fc',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px'
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#4D216D',
    marginBottom: '12px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid rgba(192,132,252,0.3)'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px',
    background: '#f9fafb',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '12px'
  },
  resultBox: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px'
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#4D216D',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  stat: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151'
  },
  successBox: {
    background: '#d1fae5',
    border: '2px solid #34d399',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px'
  },
  errorBox: {
    background: '#fee2e2',
    border: '2px solid #f87171',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    color: '#dc2626'
  },
  messageBox: {
    background: '#dbeafe',
    border: '2px solid #60a5fa',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    color: '#1e40af'
  },
  confirmBox: {
    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '2px solid #fb923c',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  greenButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  grayButton: {
    padding: '12px 24px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  footer: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '2px solid #e5e7eb',
    display: 'flex',
    gap: '12px'
  }
};
