import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { styles } from "../../styles/dashboardStyles";
import { ErrorBox, MessageBox } from "../MessageBoxes";
import FailureDetailsModal from "../FailureDetailsModal";

export default function Step3Validate({ campaign, dncEnabled, uploadResult, onBack, onContinue, setValidationResult }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showFailureModal, setShowFailureModal] = useState(false);

  // Async job tracking
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const pollingIntervalRef = useRef(null);

  // Poll for job status
  const pollJobStatus = async (currentJobId) => {
    try {
      const data = await api.get(`/campaigns/validate-customers/status/${currentJobId}`);

      if (data.success && data.job) {
        const job = data.job;
        setJobStatus(job.status);
        setProgress(job.progress || 0);
        setProcessed(job.processed || 0);
        setTotal(job.total || 0);

        // Update message based on status
        if (job.status === 'processing') {
          setMessage(`Validating customers: ${job.processed || 0}/${job.total || 0} (${job.progress || 0}%)`);
        } else if (job.status === 'completed') {
          // Job completed
          setValidationResult({
            validated: job.validated,
            failed: job.failed,
            total: job.total,
            failedRecords: job.failedRecords || [],
            failedRows: job.failedRecords?.map(f => f.row) || []
          });

          if (job.failed === 0) {
            setMessage(`✅ All ${job.validated} records validated with phone numbers!`);
          } else {
            setMessage(`✅ ${job.validated} of ${job.total} records validated. ${job.failed} failed.`);
          }

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setLoading(false);
          onContinue();
        } else if (job.status === 'failed') {
          // Job failed
          setError(job.error || 'Validation job failed');

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error polling job status:', err);
      // Don't stop polling on network errors, just log them
    }
  };

  // Start polling when jobId is set
  useEffect(() => {
    if (jobId && jobStatus !== 'completed' && jobStatus !== 'failed') {
      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000);

      // Initial poll
      pollJobStatus(jobId);

      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [jobId, jobStatus]);

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
    setMessage("Starting customer validation job...");

    try {
      console.log('Starting customer validation for campaign:', campaign.id);

      const data = await api.post('/campaigns/validate-customers', {
        campaignId: campaign.id
      });

      console.log('Customer validation response:', data);

      if (data.success && data.jobId) {
        // Job started successfully
        setJobId(data.jobId);
        setTotal(data.total || 0);
        setMessage(`Validation job started. Processing ${data.total} records...`);
        // Keep loading=true, polling will handle completion
      } else {
        setError(data.error || "Failed to start validation job");
        setLoading(false);
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError(`Failed to start validation: ${err.message}`);
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
          Continue to fetch telephone numbers for {uploadResult.uploaded} records
        </p>

        {/* Progress bar */}
        {loading && jobStatus === 'processing' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151',
              fontWeight: '600'
            }}>
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '24px',
              backgroundColor: '#e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4d216d',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {progress > 10 && `${processed}/${total}`}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleValidateData}
          disabled={loading}
          style={{
            ...styles.button,
            width: '100%',
            padding: '14px',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            jobStatus === 'processing'
              ? `Validating... ${processed}/${total}`
              : "Starting validation..."
          ) : "Continue"}
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
