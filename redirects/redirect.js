// routes/redirect.js
import express from "express";

const router = express.Router();

// Success redirect bridge
router.get("/gcash-success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=myapp://completion/success" />
        <title>Redirecting...</title>
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location.href = "myapp://completion/success";
        </script>
      </body>
    </html>
  `);
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
