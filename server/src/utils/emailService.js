
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPasswordResetEmail(email, resetUrl) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.MAIL_FROM
  ) {
    throw new Error('Email service is not configured.');
  }

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Reset your Parking System password',
    text: `You requested a password reset.

Open this link to reset your password:
${resetUrl}

This link expires in 15 minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2>Password reset request</h2>
        <p>Click the button below to reset your parking account password.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 20px;background:#2457d6;color:white;text-decoration:none;border-radius:6px">
            Reset Password
          </a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendPasswordResetEmail };
