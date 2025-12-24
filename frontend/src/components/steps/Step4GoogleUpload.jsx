import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { styles } from "../../styles/dashboardStyles";
import { ErrorBox, MessageBox, SuccessBox } from "../MessageBoxes";
import FailureDetailsModal from "../FailureDetailsModal";

export default function Step4GoogleUpload({ campaign, dncEnabled, validationResult, onBack, setValidationResult }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showFailureModal, setShowFailureModal] = useState(false);

  const handleUploadToGoogle = async () => {
    if (!validationResult || validationResult.validated === 0) {
      setError("No validated data to upload");
      return;
    }

    if (!campaign || !campaign.id) {
      setError("Campaign information missing");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Uploading validated contacts to CCAI...");

    try {
      console.log('Starting upload to CCAI for campaign:', campaign.id);

      const data = await api.post('/campaigns/upload-to-ccai', {
        campaignId: campaign.id
      });

      console.log('CCAI upload response:', data);

      if (data.success) {
        setMessage(`✅ Successfully uploaded ${data.uploaded} contacts to CCAI!`);
        setValidationResult({ ...validationResult, uploaded: true });
      } else {
        setError(data.error || "CCAI upload failed");
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    navigate("/dashboard");
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>
        <span>🚀</span>
        Step 4: Upload to Google CCAIP
      </h2>

      <div style={styles.infoBox}>
        <div style={styles.infoRow}>
          <strong>Campaign ID:</strong>
          <span>{campaign.id}</span>
        </div>
        <div style={styles.infoRow}>
          <strong>Campaign Name:</strong>
          <span>{campaign.name}</span>
        </div>
        <div style={styles.infoRow}>
          <strong>DNC Check:</strong>
          <span>{dncEnabled ? "Enabled" : "Disabled"}</span>
        </div>
      </div>

      <div style={styles.resultBox}>
        <h3 style={styles.resultTitle}>
          <span>✅</span>
          Validation Results
        </h3>
        <div style={styles.stat}>
          <strong>📤 Validated:</strong> {validationResult.validated} of {validationResult.total} records
        </div>
        {validationResult.failed > 0 && (
          <div style={{ ...styles.stat, color: '#dc2626' }}>
            <strong>❌ Failed:</strong> {validationResult.failed} record(s)
            {validationResult.failedRecords && validationResult.failedRecords.length > 0 && (
              <>
                {' - '}
                <span
                  onClick={() => setShowFailureModal(true)}
                  style={{
                    color: '#7c3aed',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  View Details
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {!validationResult.uploaded && (
        <div style={styles.confirmBox}>
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#92400e' }}>
            Ready for Upload
          </p>
          <p style={{ fontSize: '13px', marginBottom: '16px', color: '#78350f' }}>
            Upload <strong>{validationResult.validated}</strong> validated records to Google CCAIP?
          </p>
          <div style={styles.buttonGroup}>
            <button
              onClick={handleUploadToGoogle}
              disabled={loading}
              style={styles.greenButton}
            >
              {loading ? "Uploading..." : "✓ Upload"}
            </button>
            <button
              onClick={onBack}
              style={styles.grayButton}
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      )}

      {validationResult.uploaded && (
        <SuccessBox message="🎉 Upload completed successfully!" />
      )}

      {message && <MessageBox message={message} />}
      <ErrorBox error={error} />

      <div style={styles.footer}>
        <button onClick={handleReset} style={styles.button}>
          🔄 Start New Upload
        </button>
      </div>

      {/* Failure Details Modal */}
      <FailureDetailsModal
        isOpen={showFailureModal}
        onClose={() => setShowFailureModal(false)}
        failedRecords={validationResult.failedRecords || []}
      />
    </div>
  );
}
