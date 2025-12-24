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
        setMessage(`Successfully uploaded ${data.total} records! ${data.uploaded} unique records after deduplication.`);
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
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ ...styles.input, padding: '14px' }}
        />
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
