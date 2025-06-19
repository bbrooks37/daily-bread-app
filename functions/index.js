// functions/index.js
// This file contains a Firebase Cloud Function to periodically delete old verses
// from the Firestore 'dailyVerses' collection.

// Import necessary Firebase modules
const functions = require('firebase-functions');
const admin = require('firebase-admin'); // For interacting with Firestore Admin SDK

// Initialize Firebase Admin SDK
// This is necessary to interact with Firestore from a Cloud Function.
// The SDK automatically picks up credentials when deployed to Firebase.
admin.initializeApp();

// Get a reference to the Firestore database
const db = admin.firestore();

// NEW DIAGNOSTIC LOGS: Log the full structure of the 'functions' object for deep debugging.
// This will help us understand why 'schedule' is missing.
console.log('[DEBUG] Initializing function: deleteOldVerses');
console.log('[DEBUG] functions object keys:', Object.keys(functions));
console.log('[DEBUG] functions.pubsub keys (if exists):', functions.pubsub ? Object.keys(functions.pubsub) : 'N/A');
console.log('[DEBUG] functions.scheduler keys (if exists):', functions.scheduler ? Object.keys(functions.scheduler) : 'N/A');
console.log('[DEBUG] Type of functions.pubsub.schedule:', typeof functions.pubsub !== 'undefined' && functions.pubsub.schedule ? typeof functions.pubsub.schedule : 'undefined or pubsub missing');
console.log('[DEBUG] Type of functions.scheduler.schedule:', typeof functions.scheduler !== 'undefined' && functions.scheduler.schedule ? typeof functions.scheduler.schedule : 'undefined or scheduler missing');


// Define a scheduled Cloud Function
// This function will run automatically at specified intervals (e.g., once every 24 hours).
// We'll use a cron-like schedule string for daily execution.
// The schedule 'every 24 hours' uses Google Cloud Scheduler.
// You can adjust the schedule as needed, e.g., 'every 12 hours', 'every 5 minutes'.
// FIX: Reverted to functions.pubsub.schedule as this is the standard v1 API for scheduled functions.
exports.deleteOldVerses = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const cutoffTime = new Date(Date.now() - ONE_DAY_MS); // Calculate the cutoff time (24 hours ago)

  console.log(`[DeleteOldVerses] Running cleanup at: ${new Date().toISOString()}`);
  console.log(`[DeleteOldVerses] Deleting verses older than: ${cutoffTime.toISOString()}`);

  const projectId = process.env.GCLOUD_PROJECT; // Get project ID from environment variable in Cloud Functions

  // Reference to your 'dailyVerses' collection
  // Ensure this path matches the one used in your frontend
  const versesRef = db.collection(`artifacts/${projectId}/public/data/dailyVerses`);

  let versesDeletedCount = 0;

  try {
    // Query for documents where 'timestamp' is less than the cutoffTime
    // Firestore queries with orderBy and where clauses might require composite indexes.
    // If you encounter 'FirebaseError: The query requires an index' errors in logs,
    // you'll need to create a composite index in the Firestore Console for (timestamp asc).
    const snapshot = await versesRef.where('timestamp', '<', cutoffTime).get();

    if (snapshot.empty) {
      console.log('[DeleteOldVerses] No old verses found to delete.');
      return null; // No documents to delete
    }

    // Create a batch write to delete documents efficiently
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      versesDeletedCount++;
    });

    await batch.commit(); // Commit the batch deletion

    console.log(`[DeleteOldVerses] Successfully deleted ${versesDeletedCount} old verses.`);
    return null; // Function completed successfully
  } catch (error) {
    console.error('[DeleteOldVerses] Error deleting old verses:', error);
    // You can also send notifications here (e.g., to Slack, email) for critical errors
    return null; // Indicate completion even if there was an error
  }
});
