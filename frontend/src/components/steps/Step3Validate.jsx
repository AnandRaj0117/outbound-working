import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { styles } from "../../styles/dashboardStyles";
import { ErrorBox, MessageBox } from "../MessageBoxes";
import FailureDetailsModal from "../FailureDetailsModal";

export default function Step3Validate({ campaign, uploadResult, onBack, onContinue, setValidationResult }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showFailureModal, setShowFailureModal] = useState(false);

  const handleValidateData = async () => {
    if (!uploadResult || uploadResult.uploaded === 0) {
      setError("No data available to validate");
      return;
    }

    if (!campaign || !campaign.id) {
      setError("Campaign information missing. Please go back to Step 1.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Fetching phone numbers from Customer API...");

    try {
      console.log('Starting customer validation for campaign:', campaign.id);

      const data = await api.post('/campaigns/validate-customers', {
        campaignId: campaign.id
      });

      console.log('Customer validation response:', data);

      if (data.success) {
        setValidationResult({
          validated: data.validated,
          failed: data.failed,
          total: data.total,
          results: data.results || [],
          failedRecords: data.failedRecords || [],
          failedRows: data.failedRows || []
        });

        if (data.failed === 0) {
          setMessage(`✅ All ${data.validated} records validated with phone numbers!`);
        } else {
          setMessage(`✅ ${data.validated} of ${data.total} records validated. ${data.failed} failed.`);
        }
        onContinue();
      } else {
        setError(data.error || "Customer validation failed");
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError(`Validation failed: ${err.message}`);
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
        <span>✅</span>
        Step 3: Validate Data
      </h2>

      <div style={styles.resultBox}>
        <h3 style={styles.resultTitle}>
          <span>💾</span>
          Upload Summary
        </h3>
        <div style={styles.stat}>
          <strong>✅ Uploaded:</strong> {uploadResult.uploaded} of {uploadResult.total} rows
        </div>
        {uploadResult.failed > 0 && (
          <div style={{ ...styles.stat, color: '#dc2626' }}>
            <strong>❌ Failed:</strong> {uploadResult.failed} row(s)
            {uploadResult.failedRecords && uploadResult.failedRecords.length > 0 && (
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

      <div style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '14px', marginBottom: '16px', color: '#374151' }}>
          Ready to validate {uploadResult.uploaded} records through MuleSoft?
        </p>
        <button
          onClick={handleValidateData}
          disabled={loading}
          style={{ ...styles.button, width: '100%', padding: '14px' }}
        >
          {loading ? "Validating..." : "Continue"}
        </button>
      </div>

      {message && <MessageBox message={message} />}
      <ErrorBox error={error} />

      <div style={styles.footer}>
        <button onClick={onBack} style={styles.grayButton}>
          ← Back
        </button>
        <button onClick={handleReset} style={styles.button}>
          🔄 Start Over
        </button>
      </div>

      {/* Failure Details Modal */}
      <FailureDetailsModal
        isOpen={showFailureModal}
        onClose={() => setShowFailureModal(false)}
        failedRecords={uploadResult.failedRecords || []}
      />
    </div>
  );
}
