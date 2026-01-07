const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx');

module.exports = function(app, dependencies) {
  const { firestore, storage, bucketName, upload, validateExcel, getFormattedTimestamp, user_auth } = dependencies;

  // ========== CCAI OUTBOUND DIALER - Configuration ==========
  const CCAI_USERNAME = process.env.CCAI_USERNAME || 'Campaign';
  const CCAI_API_KEY =
    process.env.CCAI_API_KEY ||
    '5W30W5OigA9g64qeaU1-53j2aZwnJuwi5RLik7e0B48';
  const CCAI_BASE_URL =
    process.env.CCAI_BASE_URL ||
    'https://orl-tst-ccao-pxpcvuh.ew2.ccaiplatform.com';

  // Axios config for Basic Auth
  const authConfig = {
    auth: {
      username: CCAI_USERNAME,
      password: CCAI_API_KEY,
    },
    headers: {
      Accept: 'application/json',
    },
  };

  // ========== CUSTOMER API - Configuration ==========
  const CUSTOMER_API_URL = process.env.CUSTOMER_API_URL ||
    'https://test.api.ocadoretail.com:443/orl-customers-exp-api-v1-test/api/customers/';

  // ========== HELPER FUNCTIONS ==========

  // Generate Azure AD Bearer token using client credentials (v1 endpoint)
  async function generateServiceToken() {
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const resource = process.env.RESOURCE;

    if (!tenantId) throw new Error('TENANT_ID is missing in .env');
    if (!clientId) throw new Error('CLIENT_ID is missing in .env');
    if (!clientSecret) throw new Error('CLIENT_SECRET is missing in .env');
    if (!resource) throw new Error('RESOURCE is missing in .env');

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;

    const form = new URLSearchParams();
    form.append('grant_type', 'client_credentials');
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('resource', resource);

    console.log('🔑 Requesting Azure AD token...');
    console.log('   Token URL:', tokenUrl);
    console.log('   Client ID:', clientId);
    console.log('   Resource:', resource);
    console.log('   Client Secret:', clientSecret ? '***' + clientSecret.slice(-4) : 'NOT SET');

    try {
      const res = await axios.post(tokenUrl, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });

      const accessToken = res.data?.access_token;
      if (!accessToken) {
        throw new Error(`Azure AD did not return access_token. Response: ${JSON.stringify(res.data)}`);
      }

      console.log('✅ Azure AD token obtained');
      return accessToken;
    } catch (error) {
      console.error('❌ Azure AD token request failed');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // Get phone number for a single customer
  async function getCustomerPhone(customerId, token) {
    try {
      const response = await axios.get(`${CUSTOMER_API_URL}${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      // ========== DETAILED LOGGING OF CUSTOMER API RESPONSE ==========
      console.log('╔════════════════════════════════════════════════════════════════');
      console.log('║ 📞 CUSTOMER API RESPONSE FOR:', customerId);
      console.log('╠════════════════════════════════════════════════════════════════');
      console.log('║ Full Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('╠════════════════════════════════════════════════════════════════');
      console.log('║ Available Fields:');
      console.log('║', Object.keys(response.data || {}).join(', '));
      console.log('╠════════════════════════════════════════════════════════════════');
      console.log('║ Extracted Phone:', response.data?.phone ?? 'NULL');
      console.log('╚════════════════════════════════════════════════════════════════');

      return {
        success: true,
        customerId,
        phone: response.data?.phone ?? null,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Error fetching phone for customer ${customerId}:`, error.message);

      // Generate user-friendly error message
      let userFriendlyError;
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      // Check for specific HTTP status codes
      if (statusCode === 404) {
        userFriendlyError = 'Customer ID does not exist';
      } else if (statusCode === 401 || statusCode === 403) {
        userFriendlyError = 'Authentication error - access denied';
      } else if (statusCode === 400) {
        userFriendlyError = 'Invalid customer ID format';
      } else if (statusCode === 500) {
        userFriendlyError = 'Customer API internal server error';
      } else if (statusCode === 502) {
        userFriendlyError = 'Customer API gateway error';
      } else if (statusCode === 503) {
        userFriendlyError = 'Customer API temporarily unavailable';
      } else if (statusCode === 429) {
        userFriendlyError = 'Too many requests - rate limit exceeded';
      }
      // Check for network/connection errors
      else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        userFriendlyError = 'Request timeout - customer API took too long to respond';
      } else if (error.code === 'ENOTFOUND') {
        userFriendlyError = 'Customer API server not found';
      } else if (error.code === 'ECONNREFUSED') {
        userFriendlyError = 'Customer API connection refused';
      } else if (error.code === 'ETIMEDOUT') {
        userFriendlyError = 'Network timeout while connecting to API';
      } else if (!error.response) {
        userFriendlyError = 'No response from customer API - network error';
      }
      // If we have a status code but no specific message
      else if (statusCode) {
        userFriendlyError = `Customer API error (HTTP ${statusCode})`;
      }
      // Last resort fallback with more context
      else {
        userFriendlyError = `Unable to validate customer - ${error.message || 'Unknown error'}`;
      }

      return {
        success: false,
        customerId,
        error: userFriendlyError,
        technicalError: error.message,
        status: statusCode
      };
    }
  }

  // ========== AUTHENTICATION MIDDLEWARE ==========

  /**
   * Middleware to protect API routes from unauthorized access.
   * - Allows access in local development mode (USE_LOCAL_AUTH=true)
   * - Requires SAML authentication in production
   * - Returns 401 Unauthorized if user is not authenticated
   */
  function isAuthenticated(req, res, next) {
    // Allow access in local development mode
    const isLocalDev = process.env.USE_LOCAL_AUTH === 'true';
    if (isLocalDev) {
      console.log('🔓 Local dev mode - bypassing authentication');
      return next();
    }

    // Check if user is authenticated via passport/session
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log('✅ User authenticated:', req.user?.email || 'Unknown');
      return next();
    }

    // Alternative check for session user
    if (req.user) {
      console.log('✅ User authenticated (via session):', req.user.email || 'Unknown');
      return next();
    }

    // User is not authenticated
    console.log('❌ Unauthorized API access attempt:', req.path);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be authenticated to access this resource'
    });
  }

  // ========== ROUTES ==========

  app.get('/', async (req, res) => {
    res.status(200).send({ message: "API running successfully" });
  });

  app.post("/user_auth", async (req, res) => {
    user_auth.user_authentication_func(req, res, firestore);
  });

  // ========== 📥 DOWNLOAD SAMPLE EXCEL FILE ==========
  app.get('/api/campaigns/download-sample', isAuthenticated, (req, res) => {
    try {
      console.log('📥 Sending sample Excel file...');

      const sampleFilePath = path.join(__dirname, 'samples', 'Sample_Customer_Upload.xlsx');

      console.log('   __dirname:', __dirname);
      console.log('   Full path:', sampleFilePath);

      // Check if file exists
      if (!fs.existsSync(sampleFilePath)) {
        console.error('❌ Sample file not found at:', sampleFilePath);
        return res.status(404).json({
          error: 'Sample file not found',
          path: sampleFilePath
        });
      }

      console.log('✅ Sample file found at:', sampleFilePath);

      // Get file stats
      const stats = fs.statSync(sampleFilePath);
      console.log('   File size:', stats.size, 'bytes');

      // Read file into buffer
      const fileBuffer = fs.readFileSync(sampleFilePath);
      console.log('   Buffer size:', fileBuffer.length, 'bytes');

      // Set headers for Excel file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Sample_Customer_Upload.xlsx"');
      res.setHeader('Content-Length', fileBuffer.length);

      // Send file
      res.send(fileBuffer);
      console.log('✅ Sample file sent successfully');

    } catch (error) {
      console.error('❌ Error downloading sample Excel file:', error);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        error: 'Failed to download sample file',
        details: error.message
      });
    }
  });

  // ========== 1️⃣ UPLOAD EXCEL → FIRESTORE + BUCKET ==========
  // Route: POST /api/campaigns/upload-excel
  // FormData: file (Excel), dnc (true/false), uploadedBy (string), campaignId (string)
  app.post(
    '/api/campaigns/upload-excel',
    isAuthenticated,
    upload.single('file'),
    validateExcel,
    async (req, res) => {
      try {
        const { dnc, uploadedBy, campaignId } = req.body;
        const isDNCSelected =
          dnc === true || dnc === 'true' || dnc === '1' || dnc === 'on';

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded.' });
        }

        if (!campaignId) {
          return res.status(400).json({ error: 'Campaign ID is required.' });
        }

        const tempPath = req.file.path;
        const originalName = path.basename(req.file.originalname);
        const fileExtension = path.extname(originalName);
        const fileNameWithoutExt = path.basename(originalName, fileExtension);
        const formattedTimestamp = getFormattedTimestamp();
        const destination = `${fileNameWithoutExt}_${formattedTimestamp}${fileExtension}`;

        // ----- 1. Parse Excel from temp file -----
        const workbook = xlsx.readFile(tempPath);
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        let rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });

        // Normalize keys
        const normalizeKey = (key) => key.toString().trim().toLowerCase();

        const normalizeRow = (row) => {
          const mapped = {};
          for (const key of Object.keys(row)) {
            const value = row[key];
            const k = normalizeKey(key);
            if (k === 'customerid' || k === 'customer id' || k === 'customer_id') {
              mapped.customerId = value;
            } else if (
              k === 'campaignid' ||
              k === 'campaign id' ||
              k === 'campaign_id'
            ) {
              mapped.campaignId = value;
            } else if (
              k === 'campaignname' ||
              k === 'campaign name' ||
              k === 'campaign_name'
            ) {
              mapped.campaignName = value;
            }
          }
          return mapped;
        };

        // Track failed records with detailed reasons
        const failedRecords = [];

        // Transform rows and track failures
        let transformedRows = [];
        rawRows.forEach((rawRow, index) => {
          const normalizedRow = normalizeRow(rawRow);
          const rowNumber = index + 2; // +2 because Excel is 1-indexed and row 1 is header

          // Check if customerId is missing
          if (!normalizedRow.customerId) {
            failedRecords.push({
              row: rowNumber,
              reason: 'Missing required field: customerId',
              data: rawRow
            });
            return; // Skip this row
          }

          const customerId = String(normalizedRow.customerId).trim();
          const rowCampaignId =
            normalizedRow.campaignId != null ? String(normalizedRow.campaignId).trim() : null;
          const rowCampaignName =
            normalizedRow.campaignName != null ? String(normalizedRow.campaignName).trim() : null;

          transformedRows.push({
            customerId,
            campaignId: rowCampaignId,
            campaignName: rowCampaignName,
            DNC: isDNCSelected ? true : null,
            uploadedBy: uploadedBy || null,
            uploadedAt: new Date(),
            isActive: true,
            _originalRow: rawRow,
            _rowNumber: rowNumber
          });
        });

        // ----- 2. COUNT BEFORE DEDUPLICATION -----
        const totalUploaded = transformedRows.length;
        console.log(`📊 Total rows uploaded (before dedup): ${totalUploaded}`);

        // ----- 3. Upload file to GCS bucket (WITHOUT dedup) -----
        const bucket = storage.bucket(bucketName);
        await bucket.upload(tempPath, { destination });
        fs.unlinkSync(tempPath); // remove temp file

        const encodedFileName = encodeURIComponent(destination);
        const fileUrl = `https://storage.googleapis.com/${bucketName}/${encodedFileName}`;
        console.log('✅ Excel uploaded to GCS:', fileUrl);

        // ----- 4. NOW Remove duplicates by customerId -----
        const seen = new Set();
        const uniqueRows = [];

        for (const row of transformedRows) {
          if (!row.customerId) continue;
          if (seen.has(row.customerId)) {
            // Track duplicate with details
            failedRecords.push({
              row: row._rowNumber,
              reason: 'Duplicate customerId',
              data: row._originalRow
            });
            continue;
          }
          seen.add(row.customerId);

          // Keep row number for failure tracking, remove only _originalRow
          const { _originalRow, ...cleanRow } = row;
          // Rename _rowNumber to excelRowNumber for clarity
          cleanRow.excelRowNumber = row._rowNumber;
          delete cleanRow._rowNumber;
          uniqueRows.push(cleanRow);
        }

        const totalValidatedData = uniqueRows.length;
        console.log(`✅ Total rows after dedup: ${totalValidatedData}`);
        console.log(`❌ Total failed records: ${failedRecords.length}`);

        // ----- 5. Update campaign_selections with counts -----
        const campaignSelectionRef = firestore.collection('campaign_selections').doc(String(campaignId));

        // Check if this campaign has already completed a full flow (CCAI upload exists)
        const existingCampaignDoc = await campaignSelectionRef.get();
        const existingData = existingCampaignDoc.exists ? existingCampaignDoc.data() : null;

        const hasPreviousCCAIUpload = existingData && (
          existingData.ccai_upload_date ||
          existingData.upload_to_ccai_completed_at ||
          (existingData.uploaded_to_ccai && existingData.uploaded_to_ccai > 0)
        );

        const duplicateCount = failedRecords.filter(f => f.reason.includes('Duplicate')).length;

        if (hasPreviousCCAIUpload) {
          // Campaign already completed before - DON'T update counts (keep old data visible)
          // Only update file info and upload timestamp
          console.log(`⚠️ Campaign ${campaignId} has previous completed flow - preserving old counts in table`);

          await campaignSelectionRef.set({
            fileUrl: fileUrl,
            fileName: destination,
            originalFileName: originalName,
            uploadedBy: uploadedBy || 'Unknown',
            dnc_enabled: isDNCSelected,
            last_upload_at: new Date(),
            excel_uploaded_at: new Date(),
            // Store new counts in temporary fields (for Step 4 to use)
            pending_TotalUploaded: totalUploaded,
            pending_TotalValidatedData: totalValidatedData,
            pending_duplicates_count: duplicateCount,
            pending_duplicates_data: failedRecords.filter(f => f.reason.includes('Duplicate'))
          }, { merge: true });

          console.log(`✅ Updated campaign_selections/${campaignId} - kept old counts, stored new in pending fields`);
        } else {
          // New campaign or never completed - update counts normally
          await campaignSelectionRef.set({
            TotalUploaded: totalUploaded,
            TotalValidatedData: totalValidatedData,
            duplicates_count: duplicateCount,
            duplicates_data: failedRecords.filter(f => f.reason.includes('Duplicate')),
            fileUrl: fileUrl,
            fileName: destination,
            originalFileName: originalName,
            uploadedBy: uploadedBy || 'Unknown',
            dnc_enabled: isDNCSelected,
            last_upload_at: new Date(),
            excel_uploaded_at: new Date()
          }, { merge: true });

          console.log(`✅ Updated campaign_selections/${campaignId} with counts (new campaign)`);
        }

        // ----- 6. Check for existing data and delete if found -----
        const validatedDataCollection = firestore.collection('validated_campaign_data');

        // Check if data already exists for this campaign
        const existingDataQuery = await validatedDataCollection
          .where('campaign_id_ref', '==', String(campaignId))
          .get();

        let existingRecordsCount = existingDataQuery.size;
        let dataAlreadyExisted = existingRecordsCount > 0;

        if (dataAlreadyExisted) {
          console.log(`⚠️ Found ${existingRecordsCount} existing records for campaign ${campaignId}. Deleting...`);

          // Delete existing records in batches
          let deleteBatch = firestore.batch();
          let deleteCount = 0;

          for (const doc of existingDataQuery.docs) {
            deleteBatch.delete(doc.ref);
            deleteCount++;

            if (deleteCount >= 400) {
              await deleteBatch.commit();
              deleteBatch = firestore.batch();
              deleteCount = 0;
            }
          }

          if (deleteCount > 0) {
            await deleteBatch.commit();
          }

          console.log(`✅ Deleted ${existingRecordsCount} existing records`);
        }

        // ----- 7. Save validated (deduplicated) data in NEW collection -----
        // Use batch writes for efficiency
        let batch = firestore.batch();
        let batchCount = 0;
        const savedDocIds = [];

        for (const row of uniqueRows) {
          const docRef = validatedDataCollection.doc();
          batch.set(docRef, {
            ...row,
            campaign_id_ref: String(campaignId),
            validated_at: new Date()
          });
          savedDocIds.push(docRef.id);
          batchCount++;

          // Commit batch every 400 documents
          if (batchCount >= 400) {
            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
          }
        }

        // Commit remaining documents
        if (batchCount > 0) {
          await batch.commit();
        }

        console.log(`✅ Saved ${uniqueRows.length} validated records to validated_campaign_data`);

        // ----- 8. Respond to frontend -----
        return res.status(200).json({
          success: true,
          uploaded: totalValidatedData,
          total: rawRows.length, // Total rows in Excel file (excluding header)
          failed: failedRecords.length,
          failedRows: failedRecords.map((f) => f.row), // For backward compatibility
          failedRecords: failedRecords, // Detailed failure information
          fileUrl,
          totalRecordsInFile: rawRows.length,
          uniqueRecordsSaved: totalValidatedData,
          duplicateCount: failedRecords.filter(f => f.reason.includes('Duplicate')).length,
          dncApplied: !!isDNCSelected,
          campaignId: campaignId,
          validatedDataSaved: savedDocIds.length,
          dataReplaced: dataAlreadyExisted,
          replacedRecordsCount: existingRecordsCount
        });
      } catch (error) {
        console.error('Error in /api/campaigns/upload-excel:', error);
        return res
          .status(500)
          .json({ error: `Data save failed: ${error.message}` });
      }
    }
  );

  // ========== 1.2️⃣ CUSTOMER API - Validation Endpoint ==========

  // Helper function to add delay between API calls (rate limiting)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Background validation process
  async function processCustomerValidation(campaignId, jobId) {
    try {
      console.log(`🔄 [Job ${jobId}] Starting background validation for campaign: ${campaignId}`);

      // Update job status to processing
      const jobRef = firestore.collection('validation_jobs').doc(jobId);
      await jobRef.update({
        status: 'processing',
        started_at: new Date()
      });

      // Get Azure AD token
      let token;
      try {
        token = await generateServiceToken();
      } catch (tokenError) {
        await jobRef.update({
          status: 'failed',
          error: 'Failed to get authentication token: ' + tokenError.message,
          completed_at: new Date()
        });
        return;
      }

      // Get validated data for this campaign from Firestore
      const validatedDataQuery = firestore
        .collection('validated_campaign_data')
        .where('campaign_id_ref', '==', String(campaignId));

      const snapshot = await validatedDataQuery.get();

      if (snapshot.empty) {
        await jobRef.update({
          status: 'failed',
          error: 'No validated data found for this campaign',
          completed_at: new Date()
        });
        return;
      }

      const totalRecords = snapshot.size;
      console.log(`📊 [Job ${jobId}] Found ${totalRecords} records to validate`);

      // Process each customer record
      const failedRecords = [];
      let successCount = 0;
      let failCount = 0;
      let recordIndex = 0;

      // Rate limiting configuration
      const REQUESTS_PER_SECOND = 5; // Adjust based on API limits
      const DELAY_BETWEEN_REQUESTS = 1000 / REQUESTS_PER_SECOND; // milliseconds

      // Use batch for Firestore updates
      let batch = firestore.batch();
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        recordIndex++;
        const data = doc.data();
        const customerId = data.customerId;

        if (!customerId) {
          failCount++;
          failedRecords.push({
            row: data.excelRowNumber || recordIndex,
            reason: 'Missing customerId',
            data: {
              customerId: customerId || 'N/A',
              campaignId: data.campaignId,
              campaignName: data.campaignName,
              uploadedBy: data.uploadedBy
            }
          });
          continue;
        }

        // Call customer API to get phone number with retry logic
        let phoneResult;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        while (retryCount < MAX_RETRIES) {
          phoneResult = await getCustomerPhone(customerId, token);

          // If rate limited (429), wait and retry
          if (phoneResult.status === 429 && retryCount < MAX_RETRIES - 1) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.log(`⏳ [Job ${jobId}] Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
            await delay(waitTime);
            retryCount++;
            continue;
          }

          break; // Success or non-429 error
        }

        if (phoneResult.success && phoneResult.phone) {
          // Update Firestore with phone number
          batch.update(doc.ref, {
            phoneNumber: phoneResult.phone,
            api_validated: true,
            api_validated_at: new Date(),
            customer_data: phoneResult.data
          });

          successCount++;
          batchCount++;

          // Commit batch every 400 updates
          if (batchCount >= 400) {
            await batch.commit();
            console.log(`💾 [Job ${jobId}] Committed batch of ${batchCount} updates`);
            batch = firestore.batch();
            batchCount = 0;
          }
        } else {
          failCount++;

          // Determine appropriate error message
          let failureReason;
          if (phoneResult.success && !phoneResult.phone) {
            failureReason = 'Phone number not available for customer';
          } else {
            failureReason = phoneResult.error || 'Customer validation failed - no error details available';
          }

          failedRecords.push({
            row: data.excelRowNumber || recordIndex,
            reason: failureReason,
            data: {
              customerId: customerId,
              campaignId: data.campaignId,
              campaignName: data.campaignName,
              uploadedBy: data.uploadedBy
            }
          });
        }

        // Update job progress every 10 records
        if (recordIndex % 10 === 0 || recordIndex === totalRecords) {
          await jobRef.update({
            processed: recordIndex,
            validated: successCount,
            failed: failCount,
            progress: Math.round((recordIndex / totalRecords) * 100)
          });
          console.log(`📊 [Job ${jobId}] Progress: ${recordIndex}/${totalRecords} (${Math.round((recordIndex / totalRecords) * 100)}%)`);
        }

        // Rate limiting: Add delay between requests
        if (recordIndex < totalRecords) {
          await delay(DELAY_BETWEEN_REQUESTS);
        }
      }

      // Commit remaining updates
      if (batchCount > 0) {
        await batch.commit();
        console.log(`💾 [Job ${jobId}] Committed final batch of ${batchCount} updates`);
      }

      // Update campaign_selections with validation stats
      const campaignSelectionRef = firestore
        .collection('campaign_selections')
        .doc(String(campaignId));

      // Check if campaign has previous completed flow
      const existingCampaignDoc = await campaignSelectionRef.get();
      const existingData = existingCampaignDoc.exists ? existingCampaignDoc.data() : null;

      const hasPreviousCCAIUpload = existingData && (
        existingData.ccai_upload_date ||
        existingData.upload_to_ccai_completed_at ||
        (existingData.uploaded_to_ccai && existingData.uploaded_to_ccai > 0)
      );

      if (hasPreviousCCAIUpload) {
        // Has previous completed flow - store in pending fields
        await campaignSelectionRef.set({
          pending_customers_validated: successCount,
          pending_customers_failed: failCount,
          pending_invalid_customers_count: failCount,
          pending_invalid_customers_data: failedRecords,
          pending_validation_completed_at: new Date()
        }, { merge: true });
        console.log(`✅ [Job ${jobId}] Validation stats stored in pending fields (preserving old data)`);
      } else {
        // New campaign - update normally
        await campaignSelectionRef.set({
          customers_validated: successCount,
          customers_failed: failCount,
          invalid_customers_count: failCount,
          invalid_customers_data: failedRecords,
          validation_completed_at: new Date()
        }, { merge: true });
        console.log(`✅ [Job ${jobId}] Validation stats updated (new campaign)`);
      }

      // Mark job as completed
      await jobRef.update({
        status: 'completed',
        completed_at: new Date(),
        total: totalRecords,
        validated: successCount,
        failed: failCount,
        failedRecords: failedRecords
      });

      console.log(`✅ [Job ${jobId}] Customer validation complete: ${successCount} success, ${failCount} failed`);

    } catch (error) {
      console.error(`❌ [Job ${jobId}] Error in background validation:`, error);

      // Update job status to failed
      try {
        await firestore.collection('validation_jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          completed_at: new Date()
        });
      } catch (updateError) {
        console.error(`❌ [Job ${jobId}] Failed to update job status:`, updateError);
      }
    }
  }

  // Start customer validation job (returns immediately)
  app.post('/api/campaigns/validate-customers', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }

      console.log(`🔍 Starting customer validation job for campaign: ${campaignId}`);

      // Get validated data count
      const validatedDataQuery = firestore
        .collection('validated_campaign_data')
        .where('campaign_id_ref', '==', String(campaignId));

      const snapshot = await validatedDataQuery.get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          error: 'No validated data found for this campaign'
        });
      }

      const totalRecords = snapshot.size;

      // Create validation job record
      const jobRef = firestore.collection('validation_jobs').doc();
      const jobId = jobRef.id;

      await jobRef.set({
        jobId: jobId,
        campaignId: String(campaignId),
        status: 'pending',
        total: totalRecords,
        processed: 0,
        validated: 0,
        failed: 0,
        progress: 0,
        created_at: new Date(),
        started_at: null,
        completed_at: null,
        error: null
      });

      console.log(`✅ Created validation job: ${jobId} for ${totalRecords} records`);

      // Start background processing (don't wait for it)
      processCustomerValidation(campaignId, jobId).catch(err => {
        console.error(`❌ Background validation failed for job ${jobId}:`, err);
      });

      // Return immediately with job ID
      res.status(202).json({
        success: true,
        message: 'Customer validation started',
        jobId: jobId,
        total: totalRecords,
        status: 'pending'
      });

    } catch (error) {
      console.error('Error starting customer validation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start customer validation',
        details: error.message
      });
    }
  });

  // Check validation job status
  app.get('/api/campaigns/validate-customers/status/:jobId', isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.params;

      const jobDoc = await firestore.collection('validation_jobs').doc(jobId).get();

      if (!jobDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const jobData = jobDoc.data();

      res.status(200).json({
        success: true,
        job: {
          jobId: jobData.jobId,
          campaignId: jobData.campaignId,
          status: jobData.status,
          total: jobData.total,
          processed: jobData.processed,
          validated: jobData.validated,
          failed: jobData.failed,
          progress: jobData.progress,
          failedRecords: jobData.failedRecords || [],
          error: jobData.error,
          created_at: jobData.created_at,
          started_at: jobData.started_at,
          completed_at: jobData.completed_at
        }
      });

    } catch (error) {
      console.error('Error checking job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check job status',
        details: error.message
      });
    }
  });

  // ========== 2️⃣ CCAI OUTBOUND DIALER - CAMPAIGN APIs ==========

  // ------ a) Fetch all campaigns and store in Firestore ------
  app.get('/api/ccai/campaigns', isAuthenticated, async (req, res) => {
    try {
      const url = `${CCAI_BASE_URL}/manager/api/v1/outbound_dialer/campaigns`;
      console.log(`📞 Fetching campaigns from CCAI: ${url}`);
      console.log(`   Username: ${CCAI_USERNAME}`);
      console.log(`   API Key: ${CCAI_API_KEY ? '***' + CCAI_API_KEY.slice(-4) : 'NOT SET'}`);

      const response = await axios.get(url, authConfig);

      const campaigns = response.data;

      // Store each campaign in Firestore
      let savedCount = 0;
      let failedCount = 0;

      if (Array.isArray(campaigns)) {
        const batch = firestore.batch();

        for (const campaign of campaigns) {
          try {
            const campaignId = String(campaign.campaign_id || campaign.id);
            if (!campaignId) continue;

            const campaignRef = firestore.collection('campaigns').doc(campaignId);

            const campaignDoc = {
              campaign_id: campaignId,
              campaign_name: campaign.campaign_name || campaign.name || null,
              description: campaign.description || null,
              status: campaign.status || null,
              created_at: campaign.created_at || null,
              updated_at: campaign.updated_at || null,
              full_data: campaign,
              last_fetched_at: new Date(),
              synced_from_ccai: true
            };

            batch.set(campaignRef, campaignDoc, { merge: true });
            savedCount++;
          } catch (err) {
            console.error(`Error preparing campaign for Firestore:`, err.message);
            failedCount++;
          }
        }

        try {
          await batch.commit();
          console.log(`Batch saved ${savedCount} campaigns to Firestore`);
        } catch (batchErr) {
          console.error('Error committing batch to Firestore:', batchErr.message);
        }
      }

      res.status(200).json({
        success: true,
        campaigns: campaigns,
        firestore_saved: savedCount,
        firestore_failed: failedCount
      });
    } catch (err) {
      console.error('Error fetching campaigns:', err.message);
      res
        .status(500)
        .json({ success: false, error: 'Error fetching campaigns', details: err.message });
    }
  });

  // ------ b) Fetch single campaign and store in Firestore ------
  app.get('/api/ccai/campaigns/:campaignId', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const url = `${CCAI_BASE_URL}/manager/api/v1/outbound_dialer/campaigns/${campaignId}`;

      console.log(`📞 Fetching campaign ${campaignId} from CCAI: ${url}`);
      console.log(`   Auth - Username: ${CCAI_USERNAME}`);
      console.log(`   Auth - API Key: ${CCAI_API_KEY ? '***' + CCAI_API_KEY.slice(-4) : 'NOT SET'}`);

      const response = await axios.get(url, authConfig);

      const campaignData = response.data;

      // Store campaign details in Firestore
      try {
        const campaignRef = firestore.collection('campaigns').doc(campaignId);

        // Prepare campaign document
        const campaignDoc = {
          campaign_id: campaignId,
          campaign_name: campaignData.campaign_name || campaignData.name || null,
          description: campaignData.description || null,
          status: campaignData.status || null,
          created_at: campaignData.created_at || null,
          updated_at: campaignData.updated_at || null,
          // Store the complete campaign data
          full_data: campaignData,
          // Metadata
          last_fetched_at: new Date(),
          synced_from_ccai: true
        };

        // Use set with merge to create or update
        await campaignRef.set(campaignDoc, { merge: true });

        console.log(`Campaign ${campaignId} stored/updated in Firestore`);

        res.status(200).json({
          success: true,
          campaign: campaignData,
          firestore_saved: true,
          firestore_path: `campaigns/${campaignId}`
        });
      } catch (firestoreErr) {
        console.error('Error storing campaign in Firestore:', firestoreErr.message);
        // Still return campaign data even if Firestore save fails
        res.status(200).json({
          success: true,
          campaign: campaignData,
          firestore_saved: false,
          firestore_error: firestoreErr.message
        });
      }
    } catch (err) {
      console.error('❌ Error fetching campaign:', err.message);
      if (err.response) {
        console.error('CCAI API Response Error:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
        res.status(err.response.status).json({
          success: false,
          error: 'CCAI API Error',
          details: err.message,
          ccaiError: err.response.data
        });
      } else if (err.request) {
        console.error('No response from CCAI API');
        res.status(503).json({
          success: false,
          error: 'Cannot connect to CCAI API',
          details: 'No response received from CCAI server'
        });
      } else {
        console.error('Error details:', err);
        res.status(500).json({
          success: false,
          error: 'Error fetching campaign',
          details: err.message
        });
      }
    }
  });

  // ------ NEW: Get all campaigns with upload data for table ------
  app.get('/api/campaigns/uploads', isAuthenticated, async (req, res) => {
    try {
      // Fetch all campaign selections from Firestore
      // Note: We fetch all and sort in-memory because we need to sort by ccai_upload_date
      // which might be stored as either ccai_upload_date or upload_to_ccai_completed_at
      const campaignSelectionsSnapshot = await firestore
        .collection('campaign_selections')
        .get();

      if (campaignSelectionsSnapshot.empty) {
        return res.status(200).json({
          success: true,
          campaigns: []
        });
      }

      // Convert Firestore Timestamps to ISO strings
      const convertTimestamp = (timestamp) => {
        if (!timestamp) return null;
        if (timestamp.toDate) {
          return timestamp.toDate().toISOString();
        }
        if (timestamp._seconds) {
          return new Date(timestamp._seconds * 1000).toISOString();
        }
        return timestamp;
      };

      const campaigns = [];

      for (const doc of campaignSelectionsSnapshot.docs) {
        const data = doc.data();

        // Show campaigns that have completed at least ONE full flow
        // Only skip campaigns that have NEVER been uploaded to CCAI
        const ccaiUploadDate = data.ccai_upload_date || data.upload_to_ccai_completed_at;
        const hasUploadedToCCAI = (data.uploaded_to_ccai || 0) > 0;

        // Skip ONLY if campaign has NEVER been uploaded to CCAI
        if (!ccaiUploadDate && !hasUploadedToCCAI) {
          console.log(`Skipping campaign (never uploaded to CCAI): ${doc.id}`);
          continue;
        }

        // If campaign has been uploaded to CCAI at least once, show it
        // (Even if there's a new incomplete upload, show the last completed data)

        campaigns.push({
          campaignId: doc.id,
          campaignName: data.campaign_name || 'N/A',
          uploadedBy: data.uploadedBy || 'Unknown',
          dncEnabled: data.dnc_enabled || false,
          totalUploaded: data.TotalUploaded || 0,
          totalValidated: data.TotalValidatedData || 0,
          duplicatesCount: data.duplicates_count || 0,
          duplicatesData: data.duplicates_data || [],
          invalidCount: data.invalid_customers_count || 0,
          invalidData: data.invalid_customers_data || [],
          ccaiDuplicatesCount: data.ccai_duplicates_count || 0,
          ccaiDuplicatesData: data.ccai_duplicates_data || [],
          uploadedToCCAI: data.uploaded_to_ccai || 0,
          uploadFailed: data.upload_to_ccai_failed || 0,
          excelUploadDate: convertTimestamp(data.excel_uploaded_at || data.last_upload_at),
          ccaiUploadDate: convertTimestamp(data.ccai_upload_date || data.upload_to_ccai_completed_at),
          fileUrl: data.fileUrl || null,
          fileName: data.originalFileName || data.fileName || null,
          ccaiJobId: data.ccai_job_id || null,
          customersValidated: data.customers_validated || 0,
          customersFailed: data.customers_failed || 0,
          // Store raw timestamp for sorting
          _sortTimestamp: data.ccai_upload_date || data.upload_to_ccai_completed_at
        });
      }

      // Sort by CCAI upload date (most recent first)
      // This ensures correct order even when incomplete flows update last_upload_at
      campaigns.sort((a, b) => {
        const timeA = a._sortTimestamp?.toDate ? a._sortTimestamp.toDate().getTime() : new Date(a._sortTimestamp || 0).getTime();
        const timeB = b._sortTimestamp?.toDate ? b._sortTimestamp.toDate().getTime() : new Date(b._sortTimestamp || 0).getTime();
        return timeB - timeA; // Descending order (newest first)
      });

      // Remove the temporary sort field
      campaigns.forEach(c => delete c._sortTimestamp);

      res.status(200).json({
        success: true,
        total: campaigns.length,
        campaigns: campaigns
      });

    } catch (error) {
      console.error('Error fetching campaign uploads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign uploads',
        details: error.message
      });
    }
  });

  // ------ NEW: Download original Excel file ------
  app.get('/api/campaigns/:campaignId/download', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;

      // Get campaign data from Firestore
      const campaignDoc = await firestore
        .collection('campaign_selections')
        .doc(String(campaignId))
        .get();

      if (!campaignDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

      const data = campaignDoc.data();
      const fileName = data.fileName;
      const originalFileName = data.originalFileName;

      if (!fileName) {
        return res.status(404).json({
          success: false,
          error: 'No file found for this campaign'
        });
      }

      // Download file from GCS
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'File not found in storage'
        });
      }

      // Set response headers for download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${originalFileName || fileName}"`);

      // Stream file to response
      file.createReadStream()
        .on('error', (error) => {
          console.error('Error downloading file:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Failed to download file',
              details: error.message
            });
          }
        })
        .pipe(res);

    } catch (error) {
      console.error('Error in download endpoint:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to download file',
          details: error.message
        });
      }
    }
  });

  // ------ c) Store campaign selection (called when user clicks Continue in Step 1) ------
  app.post('/api/campaigns/store-selection', isAuthenticated, async (req, res) => {
    try {
      const { campaignId, campaignName, dncEnabled } = req.body;

      console.log('Received campaign selection request:', { campaignId, campaignName, dncEnabled });

      // Validate campaignId
      if (!campaignId || campaignId === 'undefined' || campaignId === 'null') {
        console.error('Invalid campaignId received:', campaignId);
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required and must be valid',
          received: { campaignId, campaignName, dncEnabled }
        });
      }

      // Convert to string and trim
      const cleanCampaignId = String(campaignId).trim();

      if (!cleanCampaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID cannot be empty',
          received: { campaignId, campaignName, dncEnabled }
        });
      }

      // Store campaign selection in Firestore
      const selectionRef = firestore.collection('campaign_selections').doc(cleanCampaignId);

      const selectionData = {
        campaign_id: cleanCampaignId,
        campaign_name: campaignName || null,
        dnc_enabled: dncEnabled === true || dncEnabled === 'true',
        selected_at: new Date(),
        is_active: true
      };

      await selectionRef.set(selectionData, { merge: true });

      console.log(`✅ Campaign selection stored: ${cleanCampaignId}, DNC: ${dncEnabled}`);

      res.status(200).json({
        success: true,
        message: 'Campaign selection stored successfully',
        data: selectionData,
        firestore_path: `campaign_selections/${cleanCampaignId}`
      });
    } catch (error) {
      console.error('Error storing campaign selection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to store campaign selection',
        details: error.message
      });
    }
  });

  // ------ d) Fetch contacts for a campaign ------
  app.get('/api/ccai/campaigns/:campaignId/contacts', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts`;
      const response = await axios.get(url, authConfig);
      res.status(200).json(response.data);
    } catch (err) {
      console.error('Error fetching contacts:', err.message);
      res
        .status(500)
        .json({ error: 'Error fetching contacts', details: err.message });
    }
  });

  // ------ NEW: Get campaign summary with contact counts ------
  app.get('/api/ccai/campaigns/:campaignId/summary', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;

      // Get campaign details
      const campaignUrl = `${CCAI_BASE_URL}/manager/api/v1/outbound_dialer/campaigns/${campaignId}`;
      const campaignRes = await axios.get(campaignUrl, authConfig);

      // Get contacts
      const contactsUrl = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts`;
      const contactsRes = await axios.get(contactsUrl, authConfig);

      const contacts = contactsRes.data || [];

      // Format response with summary
      res.status(200).json({
        campaign: {
          id: campaignRes.data.id,
          name: campaignRes.data.name,
          status: campaignRes.data.status,
          mode: campaignRes.data.mode,
          created_at: campaignRes.data.created_at
        },
        contacts: {
          total: contacts.length,
          statuses: campaignRes.data.contact_stats || {},
          list: contacts.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            external_id: c.external_unique_id,
            status: c.status,
            created_at: c.created_at
          }))
        }
      });
    } catch (err) {
      console.error('Error fetching campaign summary:', err.message);
      res.status(500).json({
        error: 'Error fetching campaign summary',
        details: err.message
      });
    }
  });

  // ------ d) Add a single contact ------
  app.post('/api/ccai/campaigns/:campaignId/contacts', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const contactData = req.body; // { name, phone_number, email, ... }
      const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts`;

      const response = await axios.post(url, contactData, {
        ...authConfig,
        headers: {
          ...authConfig.headers,
          'Content-Type': 'application/json',
        },
      });

      res.status(200).json(response.data);
    } catch (err) {
      console.error('Error adding contact:', err.message);
      res
        .status(500)
        .json({ error: 'Error adding contact', details: err.message });
    }
  });

  // ------ NEW: Upload validated data to CCAI (Step 4) - Using CCAI CSV Format ------
  app.post('/api/campaigns/upload-to-ccai', isAuthenticated, async (req, res) => {
    try {
      const { campaignId, clearExisting = true } = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }

      console.log(`📤 Starting upload to CCAI for campaign: ${campaignId}`);
      console.log(`🗑️  Clear existing contacts: ${clearExisting}`);

      // STEP 1: Clear existing contacts if requested
      if (clearExisting) {
        try {
          console.log('🗑️  Fetching existing contacts to clear...');
          const contactsUrl = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts`;
          const contactsResponse = await axios.get(contactsUrl, authConfig);
          const existingContacts = contactsResponse.data || [];

          if (existingContacts.length > 0) {
            console.log(`🗑️  Found ${existingContacts.length} existing contacts. Deleting...`);

            const deleteUrl = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contact`;

            for (const contact of existingContacts) {
              try {
                await axios.delete(deleteUrl, {
                  ...authConfig,
                  data: { contact_id: Number(contact.id) },
                  headers: {
                    ...authConfig.headers,
                    'Content-Type': 'application/json',
                  },
                });
                console.log(`   ✓ Deleted contact: ${contact.name} (ID: ${contact.id})`);
              } catch (delError) {
                console.warn(`   ⚠️  Failed to delete contact ${contact.id}: ${delError.message}`);
              }
            }

            console.log(`✅ Cleared ${existingContacts.length} existing contacts`);
          } else {
            console.log('ℹ️  No existing contacts to clear');
          }
        } catch (clearError) {
          console.warn(`⚠️  Error clearing existing contacts: ${clearError.message}`);
          // Continue with upload even if clearing fails
        }
      }

      console.log(`📤 Starting upload to CCAI for campaign: ${campaignId}`);

      // Get validated data with phone numbers from Firestore
      const validatedDataQuery = firestore
        .collection('validated_campaign_data')
        .where('campaign_id_ref', '==', String(campaignId))
        .where('api_validated', '==', true);

      const snapshot = await validatedDataQuery.get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          error: 'No validated data found for this campaign'
        });
      }

      console.log(`📊 Found ${snapshot.docs.length} validated records`);

      // Generate JSON file with CCAI's required format
      // CCAI requires: phone_number (NOT phone!), name, external_unique_id
      const contacts = [];
      const failedRecords = [];
      const successfulDocs = []; // Track docs that will be uploaded

      // Track unique phone numbers to prevent duplicates
      const uniquePhones = new Set();
      const phoneToCustomerMap = new Map(); // Track which customer ID has which phone

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // Check if phone number is missing
        if (!data.phoneNumber || data.phoneNumber === null || data.phoneNumber === '') {
          failedRecords.push({
            row: data.excelRowNumber || data.customerId,
            customerId: data.customerId,
            reason: 'Phone number not available for customer',
            data: { customerId: data.customerId }
          });
          continue;
        }

        let phoneNumber = data.phoneNumber;

        // Clean and format phone number for CCAI (E.164 format)
        // Remove all spaces, dashes, parentheses
        phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Ensure phone number has + prefix (CCAI requirement)
        if (phoneNumber && !phoneNumber.startsWith('+')) {
          phoneNumber = '+' + phoneNumber;
        }

        // Skip invalid phone numbers (must have at least country code + number)
        if (!phoneNumber || phoneNumber.length < 8) {
          console.warn(`⚠️ Skipping invalid phone number for customer ${data.customerId}: ${data.phoneNumber}`);
          failedRecords.push({
            row: data.excelRowNumber || data.customerId,
            customerId: data.customerId,
            reason: 'Invalid phone number format',
            data: { customerId: data.customerId, phoneNumber: data.phoneNumber }
          });
          continue;
        }

        // Check for duplicate phone numbers (CCAI will reject them)
        if (uniquePhones.has(phoneNumber)) {
          const firstCustomerId = phoneToCustomerMap.get(phoneNumber);
          console.warn(`⚠️ Duplicate phone number: ${phoneNumber} found for customers ${firstCustomerId} and ${data.customerId}`);
          failedRecords.push({
            row: data.excelRowNumber || data.customerId,
            customerId: data.customerId,
            reason: `Duplicate phone number - already assigned to customer ${firstCustomerId}`,
            data: { customerId: data.customerId, phoneNumber: phoneNumber }
          });
          continue;
        }

        uniquePhones.add(phoneNumber);
        phoneToCustomerMap.set(phoneNumber, data.customerId);
        const customerName = data.campaignName || `Customer ${data.customerId}`;

        // CCAI JSON format
        contacts.push({
          name: customerName,
          phone_number: phoneNumber,
          external_unique_id: data.customerId || null
        });

        // Track successful doc for Firestore update
        successfulDocs.push(doc);
      }

      const duplicateCount = failedRecords.filter(f => f.reason.includes('Duplicate')).length;
      const skippedCount = failedRecords.filter(f => f.reason.includes('Invalid') || f.reason.includes('not available')).length;

      if (skippedCount > 0) {
        console.warn(`⚠️ Skipped ${skippedCount} contacts with invalid phone numbers`);
      }

      if (duplicateCount > 0) {
        console.warn(`⚠️ Skipped ${duplicateCount} duplicate phone numbers`);
      }

      // Check if we have any contacts left after filtering
      if (contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid unique contacts to upload after filtering',
          totalRecords: snapshot.docs.length,
          failed: failedRecords.length,
          failedRecords: failedRecords,
          skippedInvalid: skippedCount,
          skippedDuplicates: duplicateCount
        });
      }

      console.log(`📊 Total contacts to upload: ${contacts.length}`);
      console.log(`📋 Sample contacts:\n${JSON.stringify(contacts.slice(0, 3), null, 2)}`);

      // STEP 2: Upload contacts to CCAI using bulk import endpoint
      const importUrl = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts/import`;

      console.log(`📤 Uploading contacts via bulk import to CCAI: ${importUrl}`);
      console.log(`   Campaign ID: ${campaignId}`);
      console.log(`   Total contacts: ${contacts.length}`);

      // Create JSON file with contacts
      const jsonContent = JSON.stringify(contacts, null, 2);
      const jsonFilePath = path.join(os.tmpdir(), `ccai_contacts_${campaignId}_${Date.now()}.json`);

      fs.writeFileSync(jsonFilePath, jsonContent, { encoding: 'utf8' });
      console.log(`📝 Created JSON file: ${jsonFilePath}`);
      console.log(`📝 File size: ${fs.statSync(jsonFilePath).size} bytes`);

      // Upload using multipart/form-data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(jsonFilePath), {
        filename: 'contacts.json',
        contentType: 'application/json'
      });

      let uploadedCount = 0;
      let uploadFailedCount = 0;
      const uploadErrors = [];
      let jobId = null;

      try {
        console.log(`📤 Sending bulk import request...`);

        const response = await axios.post(importUrl, formData, {
          ...authConfig,
          headers: {
            ...authConfig.headers,
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        console.log(`✅ CCAI bulk import successful!`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));

        // Extract job_id
        jobId = response.data?.job_id ||
                response.data?.id ||
                response.headers?.['x-job-id'] ||
                null;

        if (!jobId && response.headers?.location) {
          const locationMatch = response.headers.location.match(/\/jobs\/(\d+)$/);
          if (locationMatch) {
            jobId = parseInt(locationMatch[1]);
          }
        }

        console.log(`   📋 Job ID: ${jobId}`);

        // Mark all contacts as uploaded
        uploadedCount = contacts.length;
        uploadFailedCount = 0;

        // Mark successfully uploaded records in Firestore
        let batch = firestore.batch();
        let batchCount = 0;

        // Only mark the successfully uploaded ones
        const successfullyUploaded = contacts.length - uploadErrors.length;

        for (let i = 0; i < successfulDocs.length; i++) {
          const doc = successfulDocs[i];
          batch.update(doc.ref, {
            uploaded_to_ccai: true,
            uploaded_to_ccai_at: new Date(),
            ccai_job_id: jobId,
            upload_status: 'success'
          });
          batchCount++;

          if (batchCount >= 400) {
            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        // Update campaign_selections
        const campaignSelectionRef = firestore
          .collection('campaign_selections')
          .doc(String(campaignId));

        const ccaiDuplicatesData = failedRecords.filter(f => f.reason.includes('Duplicate phone'));
        const ccaiDuplicatesCount = ccaiDuplicatesData.length;

        // Get existing data to check for pending fields
        const existingCampaignDoc = await campaignSelectionRef.get();
        const existingData = existingCampaignDoc.exists ? existingCampaignDoc.data() : {};

        // Prepare update object - move pending fields to main fields
        const updateData = {
          uploaded_to_ccai: uploadedCount,
          upload_to_ccai_failed: uploadFailedCount + duplicateCount + skippedCount,
          ccai_duplicates_count: ccaiDuplicatesCount,
          ccai_duplicates_data: ccaiDuplicatesData,
          upload_to_ccai_completed_at: new Date(),
          ccai_upload_date: new Date(),
          ccai_job_id: jobId
        };

        // Move pending fields to main fields (if they exist)
        if (existingData.pending_TotalUploaded !== undefined) {
          updateData.TotalUploaded = existingData.pending_TotalUploaded;
          updateData.pending_TotalUploaded = null; // Clear pending
        }
        if (existingData.pending_TotalValidatedData !== undefined) {
          updateData.TotalValidatedData = existingData.pending_TotalValidatedData;
          updateData.pending_TotalValidatedData = null;
        }
        if (existingData.pending_duplicates_count !== undefined) {
          updateData.duplicates_count = existingData.pending_duplicates_count;
          updateData.pending_duplicates_count = null;
        }
        if (existingData.pending_duplicates_data !== undefined) {
          updateData.duplicates_data = existingData.pending_duplicates_data;
          updateData.pending_duplicates_data = null;
        }
        if (existingData.pending_customers_validated !== undefined) {
          updateData.customers_validated = existingData.pending_customers_validated;
          updateData.pending_customers_validated = null;
        }
        if (existingData.pending_customers_failed !== undefined) {
          updateData.customers_failed = existingData.pending_customers_failed;
          updateData.pending_customers_failed = null;
        }
        if (existingData.pending_invalid_customers_count !== undefined) {
          updateData.invalid_customers_count = existingData.pending_invalid_customers_count;
          updateData.pending_invalid_customers_count = null;
        }
        if (existingData.pending_invalid_customers_data !== undefined) {
          updateData.invalid_customers_data = existingData.pending_invalid_customers_data;
          updateData.pending_invalid_customers_data = null;
        }

        await campaignSelectionRef.set(updateData, { merge: true });

        console.log(`✅ CCAI upload complete - moved all pending fields to main fields`);

        // Clean up temp file
        if (fs.existsSync(jsonFilePath)) {
          fs.unlinkSync(jsonFilePath);
          console.log(`🗑️  Cleaned up temp file: ${jsonFilePath}`);
        }

        res.status(200).json({
          success: true,
          message: `Upload to CCAI completed via bulk import. ${uploadedCount} contacts uploaded successfully.`,
          total: snapshot.docs.length,
          uploaded: uploadedCount,
          failed: failedRecords.length,
          failedRecords: failedRecords,
          skipped_invalid: skippedCount,
          skipped_duplicates: duplicateCount,
          upload_errors: uploadErrors,
          job_id: jobId
        });

      } catch (uploadError) {
        console.error('❌ CCAI upload failed:', uploadError.message);
        if (uploadError.response) {
          console.error('   Response Status:', uploadError.response.status);
          console.error('   Response Data:', JSON.stringify(uploadError.response.data, null, 2));
        }

        // Clean up temp file
        if (fs.existsSync(jsonFilePath)) {
          fs.unlinkSync(jsonFilePath);
        }

        res.status(500).json({
          success: false,
          error: 'CCAI upload failed',
          details: uploadError.message,
          responseStatus: uploadError.response?.status,
          responseData: uploadError.response?.data
        });
      }

    } catch (error) {
      console.error('Error uploading to CCAI:', error);
      res.status(500).json({
        success: false,
        error: 'Upload to CCAI failed',
        details: error.message
      });
    }
  });

  // ------ e) Import multiple contacts (bulk) ------
  // Frontend sends a file (CSV/JSON accepted by CCAI)
  app.post(
    '/api/ccai/campaigns/:campaignId/contacts/import',
    isAuthenticated,
    upload.single('file'),
    async (req, res) => {
      try {
        const { campaignId } = req.params;

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded.' });
        }

        const filePath = req.file.path;
        const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts/import`;

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const response = await axios.post(url, formData, {
          ...authConfig,
          headers: {
            ...authConfig.headers,
            ...formData.getHeaders(),
          },
        });

        fs.unlinkSync(filePath); // cleanup temp file

        res.status(200).json(response.data);
      } catch (err) {
        console.error('Error importing contacts:', err.message);
        res
          .status(500)
          .json({ error: 'Error importing contacts', details: err.message });
      }
    }
  );

  // ------ f) Check job status ------
  app.get(
    '/api/ccai/campaigns/:campaignId/jobs/:jobId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { campaignId, jobId } = req.params;
        const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contacts/jobs/${jobId}`;
        const response = await axios.get(url, authConfig);
        res.status(200).json(response.data);
      } catch (err) {
        console.error('Error checking job status:', err.message);
        res.status(500).json({
          error: 'Error checking job status',
          details: err.message,
        });
      }
    }
  );

  // ------ g) Update a contact ------
  app.patch('/api/ccai/campaigns/:campaignId/contact', isAuthenticated, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const contactData = req.body; // { contact_id, name, ... }
      const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contact`;

      const response = await axios.patch(url, contactData, {
        ...authConfig,
        headers: {
          ...authConfig.headers,
          'Content-Type': 'application/json',
        },
      });

      res.status(200).json(response.data);
    } catch (err) {
      console.error('Error updating contact:', err.message);
      res
        .status(500)
        .json({ error: 'Error updating contact', details: err.message });
    }
  });

  // ------ h) Delete a contact ------
  app.delete(
    '/api/ccai/campaigns/:campaignId/contact/:contactId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { campaignId, contactId } = req.params;
        const url = `${CCAI_BASE_URL}/apps/api/v1/outbound_dialer/campaigns/${campaignId}/contact`;

        const response = await axios.delete(url, {
          ...authConfig,
          data: { contact_id: Number(contactId) },
          headers: {
            ...authConfig.headers,
            'Content-Type': 'application/json',
          },
        });

        res.status(200).json(response.data);
      } catch (err) {
        console.error('Error deleting contact:', err.message);
        res
          .status(500)
          .json({ error: 'Error deleting contact', details: err.message });
      }
    }
  );
};
