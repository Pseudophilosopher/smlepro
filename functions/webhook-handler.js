const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const moyasarSecretKey = defineSecret("MOYASAR_SECRET_KEY");

/**
 * Fetch a payment from Moyasar API by payment ID.
 * Returns the payment JSON or null if not found.
 */
async function fetchMoyasarPayment(paymentId, credentials) {
  const response = await fetch(
    `https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) return null;
  return response.json();
}

/**
 * Fetch an invoice from Moyasar API by invoice ID, then extract the associated payment.
 * Returns the payment JSON or null if not found.
 */
async function fetchMoyasarPaymentFromInvoice(invoiceId, credentials) {
  const response = await fetch(
    `https://api.moyasar.com/v1/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) return null;
  const invoice = await response.json();
  // The invoice may have a `payment_id` field or a `payments` array
  if (invoice.payment_id) {
    return fetchMoyasarPayment(invoice.payment_id, credentials);
  }
  if (Array.isArray(invoice.payments) && invoice.payments.length > 0) {
    // Payments array contains payment objects directly
    const lastPayment = invoice.payments[invoice.payments.length - 1];
    if (lastPayment.status === "paid") return lastPayment;
  }
  return null;
}

/**
 * Moyasar Webhook Handler
 * Receives payment status updates from Moyasar and automatically upgrades users.
 * 
 * Moyasar sends webhook events for:
 * - payment.created
 * - payment.success
 * - payment.failed
 * - payment.pending
 */
exports.moyasarWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [moyasarSecretKey],
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const payload = req.body;
      
      // Moyasar sends the event type in the "type" field (e.g. "payment_paid")
      // NOT in an "event" field — this is the key finding from debugging!
      const eventType = payload.type || payload.event || "";
      
      logger.info("Moyasar webhook received", { 
        eventType,
        paymentId: payload.data?.id || payload.data?.attributes?.id || "unknown"
      });

      // Verify this is a payment event
      // Moyasar sends events like "payment_paid", "payment_failed", etc.
      if (!eventType.startsWith("payment")) {
        logger.warn("Invalid webhook event type", { eventType });
        res.status(400).json({ error: "Invalid event" });
        return;
      }

      // Extract payment data — Moyasar sends it as payload.data
      // The data object may be flat or use JSON:API format with "attributes"
      const rawData = payload.data || {};
      const paymentId = rawData.id || (rawData.attributes && rawData.attributes.id) || "";
      
      if (!paymentId) {
        logger.warn("Webhook event missing payment ID", { eventType, data: JSON.stringify(rawData).substring(0, 500) });
        res.status(400).json({ error: "Invalid event" });
        return;
      }

      // Normalize payment data — handle both flat and JSON:API formats
      const payment = rawData.attributes || rawData;
      const status = payment.status || rawData.status || "";
      const amount = payment.amount || rawData.amount || 0;
      const currency = payment.currency || rawData.currency || "";
      
      // The webhook payload's data object may not include metadata (it's on the invoice).
      // Fetch the full payment from Moyasar API to get metadata with userId.
      let userId = payment.metadata?.userId || rawData.metadata?.userId || "";
      
      if (!userId) {
        logger.info("userId not in webhook payload, fetching payment from Moyasar API", { paymentId });
        try {
          const secret = moyasarSecretKey.value();
          const credentials = Buffer.from(`${secret}:`).toString("base64");
          const fullPayment = await fetchMoyasarPayment(paymentId, credentials);
          if (fullPayment) {
            userId = fullPayment.metadata?.userId || "";
            // Log the full payment structure
            const paymentKeys = Object.keys(fullPayment);
            logger.info("Fetched payment from Moyasar API", { 
              paymentId, 
              hasUserId: !!userId,
              metadataKeys: fullPayment.metadata ? Object.keys(fullPayment.metadata) : [],
              paymentKeys,
              invoiceId: fullPayment.invoice_id || "none",
              description: (fullPayment.description || "").substring(0, 100)
            });
            
            // If userId not in payment metadata, try extracting from description
            // The description contains "UID:{userId}" as set in checkout.html
            if (!userId) {
              const desc = fullPayment.description || "";
              const uidMatch = desc.match(/UID:(\S+)/);
              if (uidMatch) {
                userId = uidMatch[1];
                logger.info("Extracted userId from payment description", { 
                  paymentId, 
                  userId,
                  description: desc.substring(0, 80)
                });
              } else if (fullPayment.invoice_id) {
                logger.info("userId not in payment description, trying invoice lookup", { 
                  paymentId, 
                  invoiceId: fullPayment.invoice_id 
                });
                const invoicePayment = await fetchMoyasarPaymentFromInvoice(fullPayment.invoice_id, credentials);
                if (invoicePayment) {
                  userId = invoicePayment.metadata?.userId || "";
                  if (!userId) {
                    const invDesc = invoicePayment.description || "";
                    const invMatch = invDesc.match(/UID:(\S+)/);
                    if (invMatch) userId = invMatch[1];
                  }
                  logger.info("Fetched payment via invoice lookup", { 
                    paymentId, 
                    invoiceId: fullPayment.invoice_id,
                    hasUserId: !!userId 
                  });
                }
              }
            }
          } else {
            // Try fetching as invoice
            logger.info("Payment not found, trying invoice lookup", { paymentId });
            const invoicePayment = await fetchMoyasarPaymentFromInvoice(paymentId, credentials);
            if (invoicePayment) {
              userId = invoicePayment.metadata?.userId || "";
              if (!userId) {
                const invDesc = invoicePayment.description || "";
                const invMatch = invDesc.match(/UID:(\S+)/);
                if (invMatch) userId = invMatch[1];
              }
              logger.info("Fetched payment via invoice lookup", { 
                paymentId, 
                hasUserId: !!userId 
              });
            }
          }
        } catch (fetchError) {
          logger.error("Failed to fetch payment from Moyasar API", { 
            paymentId, 
            error: fetchError.message 
          });
        }
      }

      // Log the webhook for debugging
      logger.info("Processing payment webhook", {
        paymentId,
        status,
        amount,
        currency,
        userId,
      });

      // Handle different payment statuses
      if (status === "paid") {
        await handleSuccessfulPayment(paymentId, payment, userId);
      } else if (status === "failed" || status === "canceled") {
        await handleFailedPayment(paymentId, payment, userId);
      } else if (status === "pending") {
        logger.info("Payment is pending, waiting for confirmation", { paymentId });
      }

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ received: true });
      
    } catch (error) {
      logger.error("Webhook handler error", { message: error.message });
      // Still respond with 200 to prevent Moyasar from retrying
      res.status(200).json({ received: true, error: "Internal error" });
    }
  }
);

/**
 * Handle successful payment - upgrade user to Pro
 */
async function handleSuccessfulPayment(paymentId, payment, userId) {
  if (!userId) {
    logger.error("No userId in payment metadata", { paymentId });
    return;
  }

  const paymentRef = db.collection("payments").doc(paymentId);
  const userRef = db.collection("users").doc(userId);

  // Verify the payment amount is valid
  const ALLOWED_AMOUNTS = new Set([100, 14900, 34900, 54900, 79900]);
  if (!ALLOWED_AMOUNTS.has(payment.amount)) {
    logger.error("Invalid payment amount", { 
      paymentId, 
      amount: payment.amount 
    });
    return;
  }

  // Verify currency
  if (payment.currency !== "SAR") {
    logger.error("Invalid payment currency", { 
      paymentId, 
      currency: payment.currency 
    });
    return;
  }

  // Determine if this is a test plan (1 SAR = 100 halalas) — grant 1-hour access
  const isTestPlan = payment.amount === 100;
  const proExpiresAt = isTestPlan
    ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour
    : null;

  // Update Firestore in a transaction
  await db.runTransaction(async (tx) => {
    // Check if payment already processed
    const existingPayment = await tx.get(paymentRef);
    if (existingPayment.exists && existingPayment.data()?.verified === true) {
      logger.info("Payment already processed", { paymentId });
      return;
    }

    // Record the payment
    tx.set(
      paymentRef,
      {
        uid: userId,
        verified: true,
        provider: "moyasar",
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: payment.source?.type || "unknown",
        isTestPlan,
      },
      { merge: true }
    );

    // Upgrade user to Pro (with expiry for test plan)
    const userUpdates = {
      isPremium: true,
      moyasarPaymentId: paymentId,
      upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
      upgradeSource: "webhook",
    };

    if (isTestPlan) {
      userUpdates.proExpiresAt = proExpiresAt;
      userUpdates.testPlan = true;
    }

    tx.set(userRef, userUpdates, { merge: true });
  });

  // Set custom claim for Pro status
  try {
    await admin.auth().setCustomUserClaims(userId, { isPro: true });
    logger.info("User upgraded to Pro via webhook", { 
      userId, 
      paymentId,
      amount: payment.amount,
      isTestPlan,
      expiresAt: isTestPlan ? proExpiresAt.toDate().toISOString() : "never"
    });
  } catch (authError) {
    logger.error("Failed to set custom claims", { 
      userId, 
      error: authError.message 
    });
  }
}

/**
 * Handle failed payment - log and optionally notify user
 */
async function handleFailedPayment(paymentId, payment, userId) {
  const paymentRef = db.collection("payments").doc(paymentId);
  
  // Record the failed payment
  await paymentRef.set(
    {
      uid: userId || "unknown",
      verified: false,
      provider: "moyasar",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info("Payment failed", { 
    paymentId, 
    userId,
    amount: payment.amount,
    status: payment.status 
  });

  // TODO: Optionally send email notification to user about failed payment
}