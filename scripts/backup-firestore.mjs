/**
 * SMLE Pro Firestore Backup Script
 * 
 * Creates automated backups of all Firestore collections and exports them
 * to Google Cloud Storage. Run weekly via cron or manually.
 * 
 * Usage:
 *   node scripts/backup-firestore.mjs
 * 
 * Prerequisites:
 *   - Firebase CLI installed: npm install -g firebase-tools
 *   - Google Cloud SDK installed
 *   - Authenticated: gcloud auth login
 *   - gcloud auth application-default login
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const backupDir = resolve(rootDir, 'backups');

// Firebase project configuration
const PROJECT_ID = 'smle-mock-exam-51478532-5ae31';
const GCS_BUCKET = `${PROJECT_ID}-backups`;

// Collections to backup (add new collections here)
const COLLECTIONS = [
  'users',
  'daily_scores',
  'metadata',
  'question_images',
  'deletionRequests'
];

/**
 * Generate timestamp for backup filename
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Execute shell command and return output
 */
function exec(cmd) {
  console.log(`> ${cmd}`);
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: rootDir });
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if required tools are installed
 */
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  try {
    exec('firebase --version');
    console.log('✅ Firebase CLI installed');
  } catch {
    console.error('❌ Firebase CLI not installed. Run: npm install -g firebase-tools');
    process.exit(1);
  }
  
  try {
    exec('gcloud --version');
    console.log('✅ Google Cloud SDK installed');
  } catch {
    console.error('❌ Google Cloud SDK not installed. Install from: https://cloud.google.com/sdk');
    process.exit(1);
  }
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
  }
}

/**
 * Export Firestore data using gcloud CLI
 * This creates a comprehensive backup in Google Cloud Storage
 */
async function exportFirestore() {
  const timestamp = getTimestamp();
  const backupPath = `gs://${GCS_BUCKET}/firestore/${timestamp}`;
  
  console.log(`\n🔥 Starting Firestore export to ${backupPath}...`);
  
  try {
    // Use gcloud to export Firestore
    const cmd = `gcloud firestore export ${backupPath} --project=${PROJECT_ID}`;
    exec(cmd);
    
    console.log(`✅ Firestore exported to ${backupPath}`);
    
    // Write backup manifest
    const manifest = {
      timestamp: timestamp,
      type: 'firestore_full_export',
      projectId: PROJECT_ID,
      backupPath: backupPath,
      collections: COLLECTIONS,
      createdAt: new Date().toISOString()
    };
    
    const manifestPath = resolve(backupDir, `manifest-${timestamp}.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Manifest saved to ${manifestPath}`);
    
    return manifest;
  } catch (error) {
    console.error('❌ Firestore export failed:', error.message);
    throw error;
  }
}

/**
 * Backup Cloud Functions source code
 */
async function backupFunctionsSource() {
  const timestamp = getTimestamp();
  const functionsDir = resolve(rootDir, 'functions');
  const backupPath = resolve(backupDir, `functions-${timestamp}`);
  
  console.log(`\n📦 Backing up Cloud Functions source...`);
  
  if (!existsSync(functionsDir)) {
    console.log('⚠️ Functions directory not found, skipping...');
    return null;
  }
  
  // Copy functions directory
  try {
    // Use tar to create a compressed archive
    const archivePath = resolve(backupDir, `functions-${timestamp}.tar.gz`);
    exec(`tar -czf "${archivePath}" -C "${rootDir}" functions/`);
    console.log(`✅ Functions backed up to ${archivePath}`);
    return archivePath;
  } catch (error) {
    console.error('❌ Functions backup failed:', error.message);
    return null;
  }
}

/**
 * Backup environment configuration (non-sensitive)
 */
async function backupConfig() {
  const timestamp = getTimestamp();
  
  console.log(`\n⚙️ Backing up configuration...`);
  
  const configFiles = [
    'firebase.json',
    'firestore.rules',
    'firestore.indexes.json',
    'package.json'
  ];
  
  const configBackup = {
    timestamp: timestamp,
    files: {}
  };
  
  configFiles.forEach(file => {
    const filePath = resolve(rootDir, file);
    if (existsSync(filePath)) {
      const content = execSync(`cat "${filePath}"`, { encoding: 'utf-8' });
      configBackup.files[file] = content;
    }
  });
  
  const configPath = resolve(backupDir, `config-${timestamp}.json`);
  writeFileSync(configPath, JSON.stringify(configBackup, null, 2));
  console.log(`✅ Configuration backed up to ${configPath}`);
  
  return configPath;
}

/**
 * Clean up old backups (keep last 4 weeks)
 */
function cleanupOldBackups() {
  console.log(`\n🧹 Cleaning up old backups...`);
  
  const files = readdirSync(backupDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  let deletedCount = 0;
  
  files.forEach(file => {
    const filePath = resolve(backupDir, file);
    const stats = execSync(`stat -f %m "${filePath}"`, { encoding: 'utf-8' });
    const fileAge = now - (parseInt(stats.trim()) * 1000);
    
    if (fileAge > maxAge) {
      try {
        execSync(`rm "${filePath}"`);
        deletedCount++;
        console.log(`🗑️ Deleted old backup: ${file}`);
      } catch {
        // Ignore deletion errors
      }
    }
  });
  
  console.log(`✅ Cleaned up ${deletedCount} old backups`);
}

/**
 * Send notification (email/Slack) - placeholder
 */
function sendNotification(success, details) {
  console.log(`\n📧 Notification would be sent:`);
  console.log(`   Status: ${success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Details: ${JSON.stringify(details)}`);
  
  // TODO: Implement actual notification
  // Options:
  // - Send email via SendGrid
  // - Post to Slack webhook
  // - Send SMS via Twilio for critical failures
}

/**
 * Main backup function
 */
async function runBackup() {
  console.log('🚀 SMLE Pro Backup Script');
  console.log('═══════════════════════════════════════\n');
  
  const startTime = Date.now();
  const results = {
    startTime: new Date().toISOString(),
    success: false,
    components: {}
  };
  
  try {
    // Check prerequisites
    checkPrerequisites();
    ensureBackupDir();
    
    // Run backups
    const firestoreResult = await exportFirestore();
    results.components.firestore = firestoreResult ? '✅ Success' : '⚠️ Partial';
    
    const functionsResult = await backupFunctionsSource();
    results.components.functions = functionsResult ? '✅ Success' : '⚠️ Skipped';
    
    const configResult = await backupConfig();
    results.components.config = configResult ? '✅ Success' : '❌ Failed';
    
    // Cleanup old backups
    cleanupOldBackups();
    
    results.success = true;
    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Backup completed successfully in ${results.duration}ms`);
    
  } catch (error) {
    results.success = false;
    results.error = error.message;
    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════');
    console.error(`❌ Backup failed: ${error.message}`);
  }
  
  // Send notification
  sendNotification(results.success, results);
  
  // Write final report
  const reportPath = resolve(backupDir, `backup-report-${getTimestamp()}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  process.exit(results.success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup();
}

export { runBackup };