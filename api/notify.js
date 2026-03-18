import admin from "firebase-admin";

// Initialize Firebase Admin only if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { title, body, tokens } = req.body;

  // Validate that tokens are provided
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ error: "No tokens provided" });
  }

  const message = {
    // 'notification' payload shows the system tray notification automatically
    notification: {
      title: title || "RaktaSewa",
      body: body || "New blood request",
    },
    // 'data' payload ensures the Android MyFirebaseMessagingService receives the intent
    // This is critical for reliability when the app is in the background
    data: {
      title: title || "RaktaSewa",
      body: body || "New blood request",
    },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Log failures if any for debugging
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`Token ${tokens[idx]} failed with: ${resp.error.message}`);
        }
      });
    }

    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
}
