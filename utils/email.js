import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

console.log("🔧 SMTP Debug:", {
  SMTP_USER: process.env.SMTP_USER ? "[HIDDEN]" : "❌ MISSING",
  SMTP_PASS: process.env.SMTP_PASS ? "[HIDDEN]" : "❌ MISSING",
  EMAIL_FROM: process.env.EMAIL_FROM ? "[HIDDEN]" : "❌ MISSING",
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to, token) {
  const url = `${process.env.APP_BASE_URL}/auth/verify/${token}`;
  const html = `
    <h2>Verify your email</h2>
    <p>Click <a href="${url}">here</a> to verify your account.</p>
    <p>This link expires in 30 minutes.</p>
  `;

  console.log("🔐 Nodemailer auth check:", {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? "[HIDDEN]" : "❌ MISSING",
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "MotoXelerate — Verify your email",
      html,
    });
    console.log(`📧 Verification email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email send failed:", err);
  }
}
