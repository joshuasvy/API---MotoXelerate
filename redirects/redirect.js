import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/**
 * Helper: build redirect HTML page
 */
const buildRedirectPage = (deepLink) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="refresh" content="0;url=${deepLink}" />
      <title>Redirecting...</title>
    </head>
    <body>
      <p>Redirecting to app...</p>
      <script>
        window.location.href = "${deepLink}";
      </script>
    </body>
  </html>
`;

/**
 * Success redirect bridge
 */
router.get("/gcash-success", async (req, res) => {
  console.log("Redirect query params:", req.query);

  // Xendit may send `id`, `invoice_id`, or `external_id`
  const invoiceId =
    req.query.id || req.query.invoice_id || req.query.external_id;

  if (!invoiceId) {
    console.error("Missing invoice ID in redirect:", req.query);
    return res.send(
      buildRedirectPage("myapp://completion/failure?error=missing_invoice_id")
    );
  }

  try {
    const response = await axios.get(
      `https://api.xendit.co/v2/invoices/${invoiceId}`,
      {
        auth: {
          username: process.env.XENDIT_GCASH_API,
          password: "",
        },
      }
    );

    const invoice = response.data;

    const deepLink = `myapp://completion/success?amount=${invoice.amount}&method=${invoice.payment_method}&invoice=${invoice.id}`;

    res.send(buildRedirectPage(deepLink));
  } catch (err) {
    console.error("Error fetching invoice:", err.message);
    res.send(
      buildRedirectPage("myapp://completion/failure?error=fetch_failed")
    );
  }
});

/**
 * Failure redirect bridge
 */
router.get("/gcash-failure", (req, res) => {
  res.send(buildRedirectPage("myapp://completion/failure"));
});

export default router;
