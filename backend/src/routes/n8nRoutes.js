const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Import models
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');
const HeaderProcessing = require('../models/HeaderProcessing');

// In-memory job storage (replace with database in production)
const jobs = new Map();

// Generate unique job ID
function generateJobId() {
  return crypto.randomBytes(16).toString('hex');
}

// Start workflow execution in background
router.post('/trigger-workflow', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const jobId = generateJobId();

    // Create job record
    const job = {
      id: jobId,
      status: 'processing',
      startDate,
      endDate,
      createdAt: new Date(),
      result: null,
      error: null,
    };

    jobs.set(jobId, job);

    logger.info('Created job:', { jobId, startDate, endDate });

    // Return job ID immediately
    res.json({ jobId, status: 'processing' });

    // Execute workflow in background (don't await)
    executeWorkflow(jobId, startDate, endDate);

  } catch (error) {
    logger.error('Error creating job:', error.message);
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message,
    });
  }
});

// Get job status
router.get('/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Callback endpoint for n8n to notify when workflow completes
router.post('/workflow-callback/:jobId', (req, res) => {
  const { jobId } = req.params;

  const job = jobs.get(jobId);

  if (!job) {
    logger.warn('Callback for unknown job:', { jobId });
    return res.status(404).json({ error: 'Job not found' });
  }

  // n8n called callback = workflow completed successfully
  job.status = 'completed';
  job.result = req.body || { success: true }; // Accept any body or empty
  job.completedAt = new Date();
  logger.info('Workflow completed via callback:', { jobId });

  res.json({ success: true });
});

// Execute workflow in background
async function executeWorkflow(jobId, startDate, endDate) {
  const job = jobs.get(jobId);

  try {
    logger.info('Starting workflow execution:', { jobId, startDate, endDate });

    // Construct callback URL for n8n to call when done
    const callbackUrl = process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/n8n/workflow-callback/${jobId}`
      : `http://localhost:5000/api/n8n/workflow-callback/${jobId}`;

    logger.info('Callback URL:', { callbackUrl });

    const response = await axios.post(
      'http://localhost:5678/webhook/4291406d-c1d0-4663-80f3-7f6b4f8fc188',
      {
        startDate,
        endDate,
        jobId,           // Send jobId to n8n
        callbackUrl,     // Send callback URL to n8n
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // No timeout - let n8n finish (removing timeout option entirely)
      }
    );

    // Update job as completed
    job.status = 'completed';
    job.result = response.data;
    job.completedAt = new Date();

    logger.info('Workflow completed:', { jobId });

  } catch (error) {
    // Check if it's a 524 error (Cloudflare timeout)
    if (error.response?.status === 524) {
      // 524 means Cloudflare timed out, but n8n workflow is still running
      // Keep the job as "processing" and wait for callback
      logger.warn('Got 524 timeout, but workflow may still be running. Waiting for callback...', { jobId });
      // Don't update job status - keep it as "processing"
    } else {
      // Real error - mark job as failed
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      logger.error('Workflow failed:', { jobId, error: error.message });
    }
  }
}

// Endpoint: Reprocess single item (send id_processed to n8n webhook)
router.post('/reprocess-item/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;

    // Get model based on collection
    let Model;
    if (collection === 'new-products') {
      Model = NewProductService;
    } else if (collection === 'market-trends') {
      Model = BankingMarketTrend;
    } else if (collection === 'fintech-news') {
      Model = FintechNews;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Find item
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = 'http://localhost:5678/webhook/4291406d-c1d0-4663-80f3-7f6b4f8fc190';

    // Use id_processed if available, otherwise use _id
    const idToSend = item.id_processed || id;

    logger.info('🔄 Sending id_processed to n8n:', { id_processed: idToSend });

    // Send only id_processed to n8n webhook
    const webhookResponse = await axios.post(n8nWebhookUrl, {
      id_processed: idToSend
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    logger.info('✅ id_processed sent to n8n successfully');

    res.json({
      success: true,
      message: 'Đã gửi yêu cầu tóm tắt lại',
      data: {
        id_processed: idToSend
      }
    });

  } catch (error) {
    logger.error('❌ Error in reprocess-item:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      error: error.message
    });
  }
});

// Endpoint: Get HeaderProcessing document by id_processed (the id_processed string contains the HeaderProcessing _id)
router.post('/get-header-processing', async (req, res) => {
  try {
    const { id_processed } = req.body;

    if (!id_processed) {
      return res.status(400).json({ success: false, message: 'id_processed is required' });
    }

    // id_processed is a string like "694272a4223c0f32235aded7" which is the _id of HeaderProcessing document
    const headerDoc = await HeaderProcessing.findById(id_processed);
    if (!headerDoc) {
      return res.status(404).json({ success: false, message: 'HeaderProcessing document not found' });
    }

    res.json({
      success: true,
      data: headerDoc
    });

  } catch (error) {
    logger.error('❌ Error fetching HeaderProcessing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HeaderProcessing document',
      error: error.message
    });
  }
});

// Endpoint: Update HeaderProcessing topic_classification
router.patch('/update-topic-classification', async (req, res) => {
  try {
    const { id_processed, topic_classification } = req.body;

    if (!id_processed || !topic_classification) {
      return res.status(400).json({ success: false, message: 'id_processed and topic_classification are required' });
    }

    // Update the HeaderProcessing document where _id = id_processed
    const headerDoc = await HeaderProcessing.findByIdAndUpdate(
      id_processed,
      { topic_classification },
      { new: true }
    );

    if (!headerDoc) {
      return res.status(404).json({ success: false, message: 'HeaderProcessing document not found' });
    }

    logger.info('✅ Updated topic_classification:', { id_processed, topic_classification });

    res.json({
      success: true,
      message: 'Đã cập nhật phân loại',
      data: headerDoc
    });

  } catch (error) {
    logger.error('❌ Error updating topic_classification:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update topic_classification',
      error: error.message
    });
  }
});

// Endpoint: Reprocess with callback - handles sending to n8n (using job-based pattern)
router.post('/reprocess-with-callback', async (req, res) => {
  try {
    const { id_processed, collection, itemId } = req.body;

    if (!id_processed || !collection || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id_processed, collection, itemId'
      });
    }

    // Generate jobId for this reprocess task
    const jobId = generateJobId();

    // Create job record
    const job = {
      id: jobId,
      status: 'processing',
      id_processed,
      collection,
      itemId,
      createdAt: new Date(),
      result: null,
      error: null,
    };

    jobs.set(jobId, job);

    logger.info('Created reprocess job:', { jobId, id_processed, collection, itemId });

    // Return job ID immediately
    res.json({ jobId, status: 'processing' });

    // Execute reprocess in background (don't await)
    executeReprocess(jobId, id_processed, collection, itemId);

  } catch (error) {
    logger.error('❌ Error in reprocess-with-callback:', error.message);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      error: error.message
    });
  }
});

// Execute reprocess in background
async function executeReprocess(jobId, id_processed, collection, itemId) {
  const job = jobs.get(jobId);

  try {
    logger.info('Starting reprocess execution:', { jobId, id_processed });

    // Construct callback URL
    const callbackUrl = process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/n8n/reprocess-complete/${jobId}/${collection}/${itemId}`
      : `http://localhost:5000/api/n8n/reprocess-complete/${jobId}/${collection}/${itemId}`;

    logger.info('Reprocess callback URL:', { callbackUrl });

    const n8nWebhookUrl = 'http://localhost:5678/webhook/4291406d-c1d0-4663-80f3-7f6b4f8fc190';

    await axios.post(n8nWebhookUrl, {
      id_processed,
      callbackUrl
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    logger.info('✅ Sent to n8n successfully, waiting for callback...');

  } catch (error) {
    // Check if it's a 524 error (Cloudflare timeout)
    if (error.response?.status === 524) {
      logger.warn('Got 524 timeout, but reprocess may still be running. Waiting for callback...', { jobId });
      // Don't update job status - keep it as "processing"
    } else {
      // Real error - mark job as failed
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      logger.error('Reprocess failed:', { jobId, error: error.message });
    }
  }
}

// Callback endpoint: Called by n8n when reprocessing completes (new job-based pattern)
router.post('/reprocess-complete/:jobId/:collection/:itemId', async (req, res) => {
  try {
    const { jobId, collection, itemId } = req.params;

    logger.info('📞 Received reprocess completion callback:', { jobId, collection, itemId });

    const job = jobs.get(jobId);

    if (!job) {
      logger.warn('Callback for unknown reprocess job:', { jobId });
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get model based on collection
    let Model;
    if (collection === 'new-products') {
      Model = NewProductService;
    } else if (collection === 'market-trends') {
      Model = BankingMarketTrend;
    } else if (collection === 'fintech-news') {
      Model = FintechNews;
    } else {
      job.status = 'failed';
      job.error = 'Invalid collection';
      job.completedAt = new Date();
      return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Delete the document
    const deletedDoc = await Model.findByIdAndDelete(itemId);

    if (!deletedDoc) {
      logger.warn('⚠️ Document not found for deletion:', { collection, itemId });
      job.status = 'failed';
      job.error = 'Document not found';
      job.completedAt = new Date();
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Mark job as completed
    job.status = 'completed';
    job.result = { success: true, deletedDoc };
    job.completedAt = new Date();

    logger.info('✅ Reprocess completed, document deleted:', { jobId, collection, itemId });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('❌ Error in reprocess-complete callback:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

// Legacy callback endpoint: Keep for backward compatibility (deprecated)
router.post('/reprocess-callback/:collection/:itemId', async (req, res) => {
  try {
    const { collection, itemId } = req.params;

    logger.info('📞 Received legacy reprocess callback:', { collection, itemId });

    // Get model based on collection
    let Model;
    if (collection === 'new-products') {
      Model = NewProductService;
    } else if (collection === 'market-trends') {
      Model = BankingMarketTrend;
    } else if (collection === 'fintech-news') {
      Model = FintechNews;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Delete the document
    const deletedDoc = await Model.findByIdAndDelete(itemId);

    if (!deletedDoc) {
      logger.warn('⚠️ Document not found for deletion:', { collection, itemId });
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    logger.info('🗑️ Document deleted successfully:', { collection, itemId });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('❌ Error in reprocess-callback:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

module.exports = router;
