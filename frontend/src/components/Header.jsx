import React from "react";
import { useNavigate } from "react-router-dom";
import { styles } from "../styles/dashboardStyles";

export default function Header({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        <span style={styles.headerIcon}>📞</span>
        <div>
          <h1 style={styles.headerTitle}>Outbound Dialer Portal</h1>
          <p style={styles.headerSubtitle}>Campaign Management & Data Processing</p>
        </div>
      </div>
      <div style={styles.headerRight}>
        <span style={styles.userInfo}>
          Welcome, <strong>{user.name}</strong>
        </span>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ ...styles.logoutBtn, background: '#6b7280' }}
        >
          ← Back to Dashboard
        </button>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
}
