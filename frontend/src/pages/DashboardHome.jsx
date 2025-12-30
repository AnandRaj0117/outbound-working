import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";

const _rawApiBase = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL;
const API_BASE = _rawApiBase
  ? (_rawApiBase.endsWith('/api') ? _rawApiBase.replace(/\/+$/, '') : _rawApiBase.replace(/\/+$/, '') + '/api')
  : 'http://localhost:8080/api';

const api = {
  get: async (url) => {
    const res = await fetch(`${API_BASE}${url}`);
    return res.json();
  }
};

export default function DashboardHome({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);

  // const handleLogout = () => {
  //   onLogout();
  //   history.push('/login');
  // };
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Fetch real data from backend API
      const response = await fetch(`${API_BASE}/campaigns/uploads`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();

      // Map backend data to frontend format
      const formattedCampaigns = (data.campaigns || []).map((campaign, index) => ({
        id: index + 1,
        timestamp: formatDate(campaign.ccaiUploadDate || campaign.excelUploadDate),
        userName: campaign.uploadedBy,
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        dnc: campaign.dncEnabled ? "Enabled" : "Disabled",
        totalUploaded: campaign.totalUploaded,
        totalValidated: campaign.totalValidated,
        uploadedInCCAIp: campaign.uploadedToCCAI,
      }));

      setCampaigns(formattedCampaigns);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/London'
    }).replace(',', '');
  };

  const handleDownload = (campaignId) => {
    // Download the original Excel file
    window.location.href = `${API_BASE}/campaigns/${campaignId}/download`;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = campaigns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(campaigns.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const styles = {
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
      cursor: 'pointer',
      transition: 'background 0.3s'
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 20px'
    },
    topSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    pageTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1f2937',
      margin: 0
    },
    createButton: {
      background: '#10b981',
      color: 'white',
      border: 'none',
      padding: '12px 28px',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'background 0.3s'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100vh - 200px)' // Allow card to take most of viewport height
    },
    tableContainer: {
      overflowX: 'auto',
      overflowY: 'auto',
      maxWidth: '100%',
      flex: 1 // Allow table container to grow and be scrollable
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      background: '#4d216d',
      padding: '16px',
      textAlign: 'left',
      fontSize: '13px',
      fontWeight: '700',
      color: 'white',
      borderBottom: '2px solid #e5e7eb',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '16px',
      fontSize: '14px',
      color: '#1f2937',
      borderBottom: '1px solid #e5e7eb'
    },
    actionButton: {
      background: '#4D216D',
      color: 'white',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'background 0.3s'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      padding: '20px',
      borderTop: '1px solid #e5e7eb'
    },
    pageButton: {
      padding: '8px 14px',
      border: '1px solid #e5e7eb',
      background: 'white',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    pageButtonActive: {
      padding: '8px 14px',
      border: '1px solid #4D216D',
      background: '#4D216D',
      color: 'white',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6b7280'
    },
    badge: {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    },
    badgeEnabled: {
      background: '#d1fae5',
      color: '#065f46'
    },
    badgeDisabled: {
      background: '#fee2e2',
      color: '#dc2626'
    },
    paginationControls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderTop: '1px solid #e5e7eb'
    },
    itemsPerPageContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    itemsPerPageLabel: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: '600'
    },
    itemsPerPageButton: {
      padding: '6px 12px',
      border: '1px solid #e5e7eb',
      background: 'white',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontWeight: '500'
    },
    itemsPerPageButtonActive: {
      padding: '6px 12px',
      border: '1px solid #4D216D',
      background: '#4D216D',
      color: 'white',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    paginationButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  };

  return (
    <div style={styles.page}>
      {/* <div style={styles.header}>
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
            onClick={handleLogout}
            style={styles.logoutBtn}
            onMouseEnter={(e) => e.target.style.background = '#be123c'}
            onMouseLeave={(e) => e.target.style.background = '#e11d48'}
          >
            Logout
          </button>
        </div>
      </div> */}

      <div style={styles.container}>
        <div style={styles.topSection}>
          <h2 style={styles.pageTitle}>Campaign History</h2>
          <button
            onClick={() => navigate('/create-campaign')}
            style={styles.createButton}
            onMouseEnter={(e) => e.target.style.background = '#059669'}
            onMouseLeave={(e) => e.target.style.background = '#10b981'}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Create Campaign
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.tableContainer}>
            {loading ? (
              <div style={styles.emptyState}>
                <p>Loading campaigns...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No campaigns found</p>
                <p style={{ fontSize: '14px' }}>Click "Create Campaign" to get started</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Time & Date</th>
                    <th style={styles.th}>User Name</th>
                    <th style={styles.th}>Campaign ID</th>
                    <th style={styles.th}>Campaign Name</th>
                    <th style={styles.th}>DNC</th>
                    <th style={styles.th}>Total Uploaded</th>
                    <th style={styles.th}>Total Validated</th>
                    <th style={styles.th}>Uploaded in CCAIP</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((campaign) => (
                    <tr key={campaign.id}>
                      <td style={styles.td}>{campaign.timestamp}</td>
                      <td style={styles.td}>{campaign.userName}</td>
                      <td style={styles.td}>{campaign.campaignId}</td>
                      <td style={styles.td}>{campaign.campaignName}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(campaign.dnc === "Enabled" ? styles.badgeEnabled : styles.badgeDisabled)
                        }}>
                          {campaign.dnc}
                        </span>
                      </td>
                      <td style={styles.td}>{campaign.totalUploaded.toLocaleString()}</td>
                      <td style={styles.td}>{campaign.totalValidated.toLocaleString()}</td>
                      <td style={styles.td}>{campaign.uploadedInCCAIp.toLocaleString()}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleDownload(campaign.campaignId)}
                          style={styles.actionButton}
                          onMouseEnter={(e) => e.target.style.background = '#3d1a57'}
                          onMouseLeave={(e) => e.target.style.background = '#4D216D'}
                        >
                          <Download size={16} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {campaigns.length > 0 && (
            <div style={styles.paginationControls}>
              {/* Items per page selector */}
              <div style={styles.itemsPerPageContainer}>
                <span style={styles.itemsPerPageLabel}>Items per page:</span>
                <button
                  onClick={() => handleItemsPerPageChange(5)}
                  style={itemsPerPage === 5 ? styles.itemsPerPageButtonActive : styles.itemsPerPageButton}
                  onMouseEnter={(e) => {
                    if (itemsPerPage !== 5) {
                      e.target.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (itemsPerPage !== 5) {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  5
                </button>
                <button
                  onClick={() => handleItemsPerPageChange(10)}
                  style={itemsPerPage === 10 ? styles.itemsPerPageButtonActive : styles.itemsPerPageButton}
                  onMouseEnter={(e) => {
                    if (itemsPerPage !== 10) {
                      e.target.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (itemsPerPage !== 10) {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  10
                </button>
                <button
                  onClick={() => handleItemsPerPageChange(20)}
                  style={itemsPerPage === 20 ? styles.itemsPerPageButtonActive : styles.itemsPerPageButton}
                  onMouseEnter={(e) => {
                    if (itemsPerPage !== 20) {
                      e.target.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (itemsPerPage !== 20) {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  20
                </button>
              </div>

              {/* Pagination buttons */}
              {campaigns.length > itemsPerPage && (
                <div style={styles.paginationButtons}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      ...styles.pageButton,
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>

                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        style={currentPage === pageNumber ? styles.pageButtonActive : styles.pageButton}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNumber) {
                            e.target.style.background = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNumber) {
                            e.target.style.background = 'white';
                          }
                        }}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      ...styles.pageButton,
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
