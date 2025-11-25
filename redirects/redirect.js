import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Success redirect bridge
router.get("/gcash-success", async (req, res) => {
  const { invoice_id } = req.query;

  try {
    const response = await axios.get(
      `https://api.xendit.co/v2/invoices/${invoice_id}`,
      {
        auth: {
          username: process.env.XENDIT_GCASH_API,
          password: "",
        },
      }
    );

    const invoice = response.data;

    // Build deep link with real info
    const deepLink = `myapp://completion/success?amount=${invoice.amount}&method=${invoice.payment_method}&invoice=${invoice.id}`;

    res.send(`
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
    `);
  } catch (err) {
    console.error(err);
    res.redirect("myapp://completion/failure");
  }
});

// Failure redirect bridge
router.get("/gcash-failure", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=myapp://completion/failure" />
        <title>Redirecting...</title>
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location.href = "myapp://completion/failure";
        </script>
      </body>
    </html>
  `);
});

export default router;
