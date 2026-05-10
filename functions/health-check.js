/**
 * SMLE Pro Health Check API
 * 
 * Provides endpoint for uptime monitoring and system health verification.
 * Returns status of all critical dependencies.
 * 
 * Usage: GET https://us-central1-smle-mock-exam-51478532-5ae31.cloudfunctions.net/healthCheck
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * System health check endpoint
 * Returns overall system health and status of all dependencies
 */
exports.healthCheck = functions.https.onRequest(async (req, res) => {
  const startTime = Date.now();
  const version = process.env.npm_package_version || '1.0.0';
  
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: version,
    checks: {
      firestore: { status: 'unknown' },
      functions: { status: 'healthy' },
      uptime: { status: 'healthy', seconds: process.uptime() }
    },
    metadata: {
      region: process.env.FUNCTION_REGION || 'us-central1',
      projectId: process.env.GCLOUD_PROJECT || 'smle-mock-exam-51478532-5ae31'
    }
  };
  
  // Check Firestore connectivity
  try {
    const testStart = Date.now();
    await db.collection('metadata').doc('health_check').get();
    const latency = Date.now() - testStart;
    
    healthStatus.checks.firestore = {
      status: 'healthy',
      latency_ms: latency
    };
    
    // Degraded if latency > 1000ms
    if (latency > 1000) {
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.checks.firestore = {
      status: 'unhealthy',
      error: error.message
    };
    healthStatus.status = 'unhealthy';
  }
  
  // Set response status code based on health
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

/**
 * Detailed system metrics endpoint (authenticated only)
 * Returns detailed metrics for monitoring dashboards
 */
exports.healthMetrics = functions.https.onRequest(async (req, res) => {
  // Basic auth check - in production, use Firebase Admin SDK to verify token
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const metrics = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    region: process.env.FUNCTION_REGION || 'us-central1',
    
    // Process metrics
    process: {
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      cpu_usage_percent: process.cpuUsage()
    },
    
    // Firebase metrics (would need Firestore queries for real data)
    firebase: {
      projectId: process.env.GCLOUD_PROJECT,
      firestore_enabled: true,
      auth_enabled: true,
      functions_enabled: true
    },
    
    // Deployment info
    deployment: {
      deployed_at: process.env.FUNCTION_DEPLOYED_AT || 'unknown',
      build_id: process.env.BUILD_ID || 'unknown'
    }
  };
  
  res.json(metrics);
});

/**
 * Scheduled health check - runs every 5 minutes
 * Logs health status and can trigger alerts
 */
exports.scheduledHealthCheck = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    const timestamp = new Date().toISOString();
    
    try {
      // Quick health check
      const testStart = Date.now();
      await db.collection('metadata').doc('health_check').get();
      const latency = Date.now() - testStart;
      
      // Log health status
      console.log('[Health Check] ' + timestamp + ' - Status: HEALTHY, Latency: ' + latency + 'ms');
      
      // If latency is high, log warning
      if (latency > 1000) {
        console.warn('[Health Check] ' + timestamp + ' - WARNING: High latency detected (' + latency + 'ms)');
      }
      
      return null;
    } catch (error) {
      console.error('[Health Check] ' + timestamp + ' - ERROR: ' + error.message);
      
      // In production, send alert to Slack/email here
      // await sendAlert('Health check failed', error.message);
      
      return null;
    }
  });

/**
 * Ping endpoint - simple uptime check
 * Returns 200 OK if function is running
 */
exports.ping = functions.https.onRequest((req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    region: process.env.FUNCTION_REGION || 'us-central1'
  });
});