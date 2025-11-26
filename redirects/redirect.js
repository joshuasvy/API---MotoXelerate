import express from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

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

router.get("/gcash-success", (req, res) => {
  const referenceId = req.query.reference_id;
  if (!referenceId) {
    return res.send(
      buildRedirectPage("myapp://completion/failure?error=missing_reference")
    );
  }
  const deepLink = `myapp://completion/success?reference=${referenceId}`;
  res.send(buildRedirectPage(deepLink));
});

router.get("/gcash-failure", (req, res) => {
  const referenceId = req.query.reference_id;
  const deepLink = referenceId
    ? `myapp://completion/failure?reference=${referenceId}`
    : "myapp://completion/failure";

  res.send(buildRedirectPage(deepLink));
});

export default router;
