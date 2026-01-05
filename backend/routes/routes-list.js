/**
 * ============================================
 * COMPLETE ROUTES LIST - REFERENCE GUIDE
 * ============================================
 *
 * Quick reference to all available API routes.
 * For implementation, see: routes/index.js
 * For controllers, see: controllers/ folder
 *
 * Total Routes: 18
 */

module.exports = {
  // ==========================================
  // HEALTH & AUTHENTICATION (2 routes)
  // ==========================================
  healthCheck: {
    method: 'GET',
    path: '/',
    description: 'API health check',
    controller: 'authController.healthCheck'
  },

  userAuth: {
    method: 'POST',
    path: '/user_auth',
    description: 'User authentication (local or SSO)',
    controller: 'authController.userAuth'
  },

  // ==========================================
  // CAMPAIGN FILES (3 routes)
  // ==========================================
  downloadSample: {
    method: 'GET',
    path: '/api/campaigns/download-sample',
    description: 'Download sample Excel template',
    controller: 'campaignController.downloadSample'
  },

  uploadExcel: {
    method: 'POST',
    path: '/api/campaigns/upload-excel',
    description: 'Upload Excel file to Firestore + GCS',
    middleware: ['upload.single(file)', 'validateExcel'],
    controller: 'campaignController.uploadExcel'
  },

  downloadCampaignFile: {
    method: 'GET',
    path: '/api/campaigns/:campaignId/download',
    description: 'Download campaign Excel file',
    params: ['campaignId'],
    controller: 'campaignController.downloadCampaignFile'
  },

  // ==========================================
  // CAMPAIGN MANAGEMENT (2 routes)
  // ==========================================
  getCampaignUploads: {
    method: 'GET',
    path: '/api/campaigns/uploads',
    description: 'Get all campaign upload history',
    controller: 'campaignController.getCampaignUploads'
  },

  storeCampaignSelection: {
    method: 'POST',
    path: '/api/campaigns/store-selection',
    description: 'Store campaign metadata',
    controller: 'campaignController.storeCampaignSelection'
  },

  // ==========================================
  // CUSTOMER VALIDATION (1 route)
  // ==========================================
  validateCustomers: {
    method: 'POST',
    path: '/api/campaigns/validate-customers',
    description: 'Validate customers via external API',
    controller: 'campaignController.validateCustomers'
  },

  // ==========================================
  // CCAI UPLOAD (1 route)
  // ==========================================
  uploadToCCAI: {
    method: 'POST',
    path: '/api/campaigns/upload-to-ccai',
    description: 'Upload validated data to CCAI',
    controller: 'campaignController.uploadToCCAI'
  },

  // ==========================================
  // CCAI CAMPAIGNS (3 routes)
  // ==========================================
  getAllCampaigns: {
    method: 'GET',
    path: '/api/ccai/campaigns',
    description: 'Get all CCAI campaigns',
    controller: 'ccaiController.getAllCampaigns'
  },

  getCampaignById: {
    method: 'GET',
    path: '/api/ccai/campaigns/:campaignId',
    description: 'Get specific campaign details',
    params: ['campaignId'],
    controller: 'ccaiController.getCampaignById'
  },

  getCampaignSummary: {
    method: 'GET',
    path: '/api/ccai/campaigns/:campaignId/summary',
    description: 'Get campaign summary',
    params: ['campaignId'],
    controller: 'ccaiController.getCampaignSummary'
  },

  // ==========================================
  // CCAI CONTACTS (6 routes)
  // ==========================================
  getContacts: {
    method: 'GET',
    path: '/api/ccai/campaigns/:campaignId/contacts',
    description: 'Get all contacts for a campaign',
    params: ['campaignId'],
    controller: 'ccaiController.getContacts'
  },

  addContact: {
    method: 'POST',
    path: '/api/ccai/campaigns/:campaignId/contacts',
    description: 'Add single contact to campaign',
    params: ['campaignId'],
    controller: 'ccaiController.addContact'
  },

  importContacts: {
    method: 'POST',
    path: '/api/ccai/campaigns/:campaignId/contacts/import',
    description: 'Bulk import contacts from file',
    params: ['campaignId'],
    middleware: ['upload.single(file)'],
    controller: 'ccaiController.importContacts'
  },

  getJobStatus: {
    method: 'GET',
    path: '/api/ccai/campaigns/:campaignId/jobs/:jobId',
    description: 'Check bulk import job status',
    params: ['campaignId', 'jobId'],
    controller: 'ccaiController.getJobStatus'
  },

  updateContact: {
    method: 'PATCH',
    path: '/api/ccai/campaigns/:campaignId/contact',
    description: 'Update an existing contact',
    params: ['campaignId'],
    controller: 'ccaiController.updateContact'
  },

  deleteContact: {
    method: 'DELETE',
    path: '/api/ccai/campaigns/:campaignId/contact/:contactId',
    description: 'Delete a contact from campaign',
    params: ['campaignId', 'contactId'],
    controller: 'ccaiController.deleteContact'
  }
};

/**
 * QUICK SUMMARY
 * ============================================
 * Total Routes: 18
 *
 * By Method:
 * - GET:    7 routes
 * - POST:   8 routes
 * - PATCH:  1 route
 * - DELETE: 1 route
 *
 * By Category:
 * - Health & Auth:         2 routes
 * - Campaign Files:        3 routes
 * - Campaign Management:   2 routes
 * - Customer Validation:   1 route
 * - CCAI Upload:           1 route
 * - CCAI Campaigns:        3 routes
 * - CCAI Contacts:         6 routes
 */
