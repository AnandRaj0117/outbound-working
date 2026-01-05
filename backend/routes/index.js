/**
 * API Routes Definition
 *
 * This file maps HTTP endpoints to their controller functions.
 * All business logic is in the controllers folder.
 */

const campaignController = require('../controllers/campaignController');
const ccaiController = require('../controllers/ccaiController');
const authController = require('../controllers/authController');

module.exports = function(app, dependencies) {
  // Pass dependencies to controllers
  campaignController.setDependencies(dependencies);
  ccaiController.setDependencies(dependencies);
  authController.setDependencies(dependencies);

  // ==========================================
  // HEALTH & AUTHENTICATION ROUTES
  // ==========================================

  /** GET / - API health check */
  app.get('/', authController.healthCheck);

  /** POST /user_auth - User authentication (local or SSO) */
  app.post('/user_auth', authController.userAuth);

  // ==========================================
  // CAMPAIGN FILE ROUTES
  // ==========================================

  /** GET /api/campaigns/download-sample - Download sample Excel template */
  app.get('/api/campaigns/download-sample', campaignController.downloadSample);

  /** POST /api/campaigns/upload-excel - Upload Excel file to Firestore + GCS */
  app.post(
    '/api/campaigns/upload-excel',
    dependencies.upload.single('file'),
    dependencies.validateExcel,
    campaignController.uploadExcel
  );

  /** GET /api/campaigns/:campaignId/download - Download campaign Excel file */
  app.get('/api/campaigns/:campaignId/download', campaignController.downloadCampaignFile);

  // ==========================================
  // CAMPAIGN MANAGEMENT ROUTES
  // ==========================================

  /** GET /api/campaigns/uploads - Get all campaign upload history */
  app.get('/api/campaigns/uploads', campaignController.getCampaignUploads);

  /** POST /api/campaigns/store-selection - Store campaign metadata */
  app.post('/api/campaigns/store-selection', campaignController.storeCampaignSelection);

  // ==========================================
  // CUSTOMER VALIDATION ROUTES
  // ==========================================

  /** POST /api/campaigns/validate-customers - Validate customers via API */
  app.post('/api/campaigns/validate-customers', campaignController.validateCustomers);

  // ==========================================
  // CCAI UPLOAD ROUTES
  // ==========================================

  /** POST /api/campaigns/upload-to-ccai - Upload validated data to CCAI */
  app.post('/api/campaigns/upload-to-ccai', campaignController.uploadToCCAI);

  // ==========================================
  // CCAI CAMPAIGN ROUTES
  // ==========================================

  /** GET /api/ccai/campaigns - Get all CCAI campaigns */
  app.get('/api/ccai/campaigns', ccaiController.getAllCampaigns);

  /** GET /api/ccai/campaigns/:campaignId - Get specific campaign details */
  app.get('/api/ccai/campaigns/:campaignId', ccaiController.getCampaignById);

  /** GET /api/ccai/campaigns/:campaignId/summary - Get campaign summary */
  app.get('/api/ccai/campaigns/:campaignId/summary', ccaiController.getCampaignSummary);

  // ==========================================
  // CCAI CONTACT ROUTES
  // ==========================================

  /** GET /api/ccai/campaigns/:campaignId/contacts - Get all contacts */
  app.get('/api/ccai/campaigns/:campaignId/contacts', ccaiController.getContacts);

  /** POST /api/ccai/campaigns/:campaignId/contacts - Add single contact */
  app.post('/api/ccai/campaigns/:campaignId/contacts', ccaiController.addContact);

  /** POST /api/ccai/campaigns/:campaignId/contacts/import - Bulk import contacts */
  app.post(
    '/api/ccai/campaigns/:campaignId/contacts/import',
    dependencies.upload.single('file'),
    ccaiController.importContacts
  );

  /** GET /api/ccai/campaigns/:campaignId/jobs/:jobId - Check job status */
  app.get('/api/ccai/campaigns/:campaignId/jobs/:jobId', ccaiController.getJobStatus);

  /** PATCH /api/ccai/campaigns/:campaignId/contact - Update a contact */
  app.patch('/api/ccai/campaigns/:campaignId/contact', ccaiController.updateContact);

  /** DELETE /api/ccai/campaigns/:campaignId/contact/:contactId - Delete a contact */
  app.delete('/api/ccai/campaigns/:campaignId/contact/:contactId', ccaiController.deleteContact);
};
