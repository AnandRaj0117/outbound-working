import React, { useState } from "react";
import api from "../../services/api";
import { styles } from "../../styles/dashboardStyles";
import { ErrorBox, MessageBox } from "../MessageBoxes";

export default function Step2Upload({ campaign, dncEnabled, user, onBack, onContinue, setUploadResult }) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelFileName, setExcelFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleDownloadSample = async (e) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
      const downloadUrl = `${backendUrl}/api/campaigns/download-sample`;

      console.log('Downloading sample file from:', downloadUrl);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'Sample_Customer_Upload.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading sample file:', err);
      setError('Failed to download sample file');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setExcelFile(file);
    setExcelFileName(file.name);
    setMessage(`File "${file.name}" selected. Ready to upload.`);
    setError("");
  };

  const handleUploadToDatabase = async () => {
    if (!excelFile) {
      setError("No file selected");
      return;
    }

    if (!campaign || !campaign.id) {
      setError("Campaign information is missing. Please go back to Step 1.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('dnc', dncEnabled);
      formData.append('uploadedBy', user?.name || 'Admin User');
      formData.append('campaignId', campaign.id);

      console.log('Uploading with campaign ID:', campaign.id);

      const data = await api.postFile('/campaigns/upload-excel', formData);

      console.log('Upload response:', data);

      if (data.success) {
        setUploadResult({
          ...data,
          uploadedData: []
        });

        let successMessage = `Successfully uploaded ${data.total} records! ${data.uploaded} unique records after deduplication.`;

        if (data.dataReplaced) {
          successMessage += ` ⚠️ Note: ${data.replacedRecordsCount} existing records for this campaign were replaced with new data.`;
        }

        setMessage(successMessage);
        onContinue();
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>
        <span>📤</span>
        Step 2: Upload Excel File
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

      <div style={styles.section}>
        <label style={styles.label}>Select File</label>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={{ ...styles.input, padding: '14px', flex: 1 }}
          />

          <a
            href="#"
            onClick={handleDownloadSample}
            style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              padding: '14px 20px',
              color: '#374151',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
            }}
          >
            <span style={{ fontSize: '16px' }}>📥</span>
            <span>Sample File</span>
          </a>
        </div>

        {excelFileName && (
          <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '13px' }}>
            📎 <strong>{excelFileName}</strong>
          </p>
        )}
      </div>

      {excelFile && (
        <button
          onClick={handleUploadToDatabase}
          disabled={loading}
          style={{ ...styles.button, width: '100%', padding: '14px' }}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      )}

      {message && <MessageBox message={message} />}
      <ErrorBox error={error} />

      <div style={styles.footer}>
        <button onClick={onBack} style={styles.grayButton}>
          ← Back
        </button>
      </div>
    </div>
  );
}
