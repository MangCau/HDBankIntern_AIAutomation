const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');
const crypto = require('crypto');

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
      'https://hdbankautoreport.app.n8n.cloud/webhook/4291406d-c1d0-4663-80f3-7f6b4f8fc188',
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

module.exports = router;
