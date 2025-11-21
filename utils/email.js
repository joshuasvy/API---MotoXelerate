import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
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
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "MotoXelerate — Verify your email",
    html,
  });
}
