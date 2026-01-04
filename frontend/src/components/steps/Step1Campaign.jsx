import React, { useState } from "react";
import api from "../../services/api";
import { styles } from "../../styles/dashboardStyles";
import { ErrorBox, MessageBox } from "../MessageBoxes";

export default function Step1Campaign({ onContinue, campaign, setCampaign, dncEnabled, setDncEnabled }) {
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [showCampaignList, setShowCampaignList] = useState(false);

  const handleSelectCampaignFromList = (selectedCampaign) => {
    console.log('Selected campaign from list:', selectedCampaign);

    const campId = selectedCampaign.id || selectedCampaign.campaign_id;
    const campName = selectedCampaign.name || selectedCampaign.campaign_name || 'Campaign';

    const campaignObj = {
      id: campId,
      name: campName,
      dncEnabled: false,
      success: true
    };

    console.log('Setting campaign from list:', campaignObj);

    setCampaign(campaignObj);
    setCampaignId(campId);
    setShowCampaignList(false);
    setAllCampaigns([]);
    setMessage(`Selected: ${campName}`);
  };

  const handleFetchCampaign = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!campaignId.trim()) {
        const data = await api.get('/ccai/campaigns');
        if (data.success) {
          setAllCampaigns(data.campaigns);
          setShowCampaignList(true);
          setMessage(`Found ${data.campaigns.length} campaigns from CCAIP. Click to select one.`);
          setCampaign(null);
        } else {
          setError(data.message || "Failed to fetch campaigns");
          setAllCampaigns([]);
        }
      } else {
        const data = await api.get(`/ccai/campaigns/${campaignId.trim()}`);
        console.log('Fetched campaign data:', data);

        if (data.success) {
          const campaignObj = {
            id: data.campaign.id || data.campaign.campaign_id || campaignId.trim(),
            name: data.campaign.name || data.campaign.campaign_name || 'Campaign',
            dncEnabled: false,
            success: true
          };
          console.log('Setting campaign object:', campaignObj);

          setCampaign(campaignObj);
          setShowCampaignList(false);
          setAllCampaigns([]);
          setMessage("Campaign fetched from CCAIP");
        } else {
          setError(data.message || "Campaign not found");
          setCampaign(null);
        }
      }
    } catch (err) {
      setError("Error connecting to CCAIP: " + err.message);
      setCampaign(null);
      setAllCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCampaign = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    console.log('Campaign object:', campaign);
    console.log('DNC Enabled:', dncEnabled);

    // Validate campaign object
    if (!campaign || !campaign.id) {
      setError("Invalid campaign selected. Please select a campaign again.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        campaignId: campaign.id,
        campaignName: campaign.name,
        dncEnabled: dncEnabled
      };

      console.log('Sending to API:', payload);

      // Store campaign selection in Firestore
      const response = await api.post('/campaigns/store-selection', payload);

      console.log('API response:', response);

      if (response.success) {
        console.log('✅ Campaign selection stored in Firestore:', response.firestore_path);
        setMessage("Campaign selection saved!");
        // Small delay to show success message
        setTimeout(() => {
          onContinue();
        }, 500);
      } else {
        const errorMsg = response.error || "Failed to store campaign selection";
        console.error('API returned error:', response);
        setError(errorMsg);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error storing campaign selection:', err);
      setError("Failed to save campaign selection: " + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>
        <span>🎯</span>
        Step 1: Select Campaign
      </h2>

      <div style={styles.section}>
        <label style={styles.label}>Campaign ID (Leave empty to fetch all campaigns)</label>
        <div style={styles.inputGroup}>
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="Enter Campaign ID (e.g., 28) or leave empty to see all"
            style={styles.input}
          />
          <button
            onClick={handleFetchCampaign}
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </div>

      {showCampaignList && allCampaigns.length > 0 && (
        <div style={{
          background: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#374151' }}>
            Select a Campaign ({allCampaigns.length} found):
          </h3>
          {allCampaigns.map((camp, index) => (
            <div
              key={index}
              onClick={() => handleSelectCampaignFromList(camp)}
              style={{
                padding: '12px',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.background = '#f0fdf4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }}
            >
              <div style={{ fontWeight: '600', color: '#1f2937' }}>
                {camp.name || camp.campaign_name || 'Unnamed Campaign'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                ID: {camp.id || camp.campaign_id}
              </div>
              {camp.status && (
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                  Status: {camp.status}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {campaign && (
        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>📋 Campaign Details</h3>
          <div style={styles.infoRow}>
            <strong>Campaign ID:</strong>
            <span>{campaign.id}</span>
          </div>
          <div style={styles.infoRow}>
            <strong>Campaign Name:</strong>
            <span>{campaign.name}</span>
          </div>

          <div style={styles.checkbox}>
            <input
              type="checkbox"
              id="dncCheck"
              checked={dncEnabled}
              onChange={(e) => setDncEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="dncCheck" style={{ fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              DNC
            </label>
          </div>

          <button
            onClick={handleConfirmCampaign}
            disabled={loading}
            style={{ ...styles.button, width: '100%', marginTop: '16px', padding: '14px' }}
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {message && <MessageBox message={message} />}
      <ErrorBox error={error} />
    </div>
  );
}
