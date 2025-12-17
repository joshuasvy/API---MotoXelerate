import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();
// Defensive log: check env variables at startup
console.log("🔧 SendGrid ENV Debug:", {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? "[HIDDEN]" : "❌ MISSING",
  EMAIL_FROM: process.env.EMAIL_FROM || "❌ MISSING",
  APP_BASE_URL: process.env.APP_BASE_URL || "❌ MISSING",
});

// Set API key
try {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("✅ SendGrid API key set successfully");
} catch (err) {
  console.error("❌ Failed to set SendGrid API key:", err);
}

export async function sendVerificationEmail(to, token) {
  const url = `${process.env.APP_BASE_URL}/api/user/auth/verify/${token}`;
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "Welcome to MotoXelerate 🚀 — Verify your account",
    text: `Hi ${to},\n\nWelcome to MotoXelerate! Please verify your account by clicking this link: ${url}\n\nThis link expires in 30 minutes.`,
    html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width:600px; margin:auto; padding:30px; background:#f9f9f9; border-radius:12px;">
      
      <!-- Logo -->
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://github.com/joshuasvy/motoXelerate-mobile-app-/blob/main/assets/Images/logo/motoxelerate.png?raw=true"
             alt="MotoXelerate Logo"
             style="width:140px; height:auto;" />
      </div>

      <!-- Heading -->
      <h2 style="color:#e63946; text-align:center; margin-bottom:10px;">Welcome to MotoXelerate 🚀</h2>
      <p style="font-size:16px; text-align:center; margin-bottom:25px;">
        We’re thrilled to have you on board. Please verify your email to activate your account:
      </p>

      <!-- Button -->
      <div style="text-align:center; margin-bottom:30px;">
        <a href="${url}"
           style="display:inline-block; background:#e63946; color:#fff; 
                  padding:14px 28px; text-decoration:none; border-radius:8px; 
                  font-weight:bold; font-size:16px; transition:background 0.3s ease;">
          Verify My Email
        </a>
      </div>

      <!-- Expiry note -->
      <p style="text-align:center; font-size:14px; color:#555; margin-bottom:20px;">
        This link will expire in 30 minutes.
      </p>

      <hr style="margin:30px 0; border:none; border-top:1px solid #ddd;" />

      <!-- Disclaimer -->
      <p style="font-size:12px; color:#999; text-align:center;">
        If you didn’t create this account, you can safely ignore this email.
      </p>

      <!-- Hover style -->
      <style>
        a:hover {
          background:#c72c3c !important;
        }
      </style>
    </div>
  `,
  };

  // Defensive log: confirm message payload
  console.log("📤 SendGrid message payload:", {
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    textPreview: msg.text,
  });

  try {
    await sgMail.send(msg);
    console.log(`📧 Verification email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email send failed:", err.response?.body || err);
  }
}
