// LandingPage.js
import React, { useState, useEffect } from "react";
import "../styles/LandingPage.css";

const _rawApiBase = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL;
const API_BASE = _rawApiBase
  ? (_rawApiBase.endsWith('/api') ? _rawApiBase.replace(/\/+$/, '') : _rawApiBase.replace(/\/+$/, '') + '/api')
  : 'http://localhost:8080/api';

const LandingPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch campaigns on component mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/campaigns/uploads`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (campaignId) => {
    window.location.href = `${API_BASE}/campaigns/${campaignId}/download`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="landing-page">
      <div className="welcome-container">
        <h1>Campaign Uploads Dashboard</h1>
        <p>View all uploaded campaigns and their status</p>
      </div>

      <div className="table-container">
        {loading && <div className="loading">Loading campaigns...</div>}

        {error && (
          <div className="error-message">
            Error: {error}
            <button onClick={fetchCampaigns}>Retry</button>
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="no-data">No campaigns uploaded yet</div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Time & Date</th>
                <th>Uploaded By</th>
                <th>Campaign ID</th>
                <th>Campaign Name</th>
                <th>DNC</th>
                <th>Total Uploaded</th>
                <th>Total Validated</th>
                <th>Uploaded in CCAI</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.campaignId}>
                  <td>{formatDate(campaign.ccaiUploadDate || campaign.excelUploadDate)}</td>
                  <td>{campaign.uploadedBy}</td>
                  <td>{campaign.campaignId}</td>
                  <td>{campaign.campaignName}</td>
                  <td>
                    <span className={`dnc-badge ${campaign.dncEnabled ? 'yes' : 'no'}`}>
                      {campaign.dncEnabled ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{campaign.totalUploaded}</td>
                  <td>{campaign.totalValidated}</td>
                  <td>
                    <span className="ccai-count">
                      {campaign.uploadedToCCAI}
                      {campaign.uploadFailed > 0 && (
                        <span className="failed-count"> ({campaign.uploadFailed} failed)</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(campaign.campaignId)}
                      title="Download original Excel file"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
