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
  const url = `${process.env.APP_BASE_URL}/auth/verify/${token}`;
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "MotoXelerate — Verify your email",
    text: `Verify your account by clicking this link: ${url}`,
    html: `<p>Click <a href="${url}">here</a> to verify your account.</p>
           <p>This link expires in 30 minutes.</p>`,
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
