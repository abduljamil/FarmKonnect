const { createTransporter } = require('../config/email');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Email template styles
const getEmailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FarmKonnect</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 28px; color: #ffffff;">🌾 FarmKonnect</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your Agricultural Marketplace</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} FarmKonnect. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                This email was sent to you because you signed up for FarmKonnect.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send email verification
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${FRONTEND_URL}/verify-email/${token}`;
  
  const content = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
      Verify Your Email Address
    </h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi <strong>${user.name}</strong>,<br><br>
      Welcome to FarmKonnect! Please verify your email address to complete your registration and start using all features.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        Verify Email Address
      </a>
    </div>
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Or copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #059669; word-break: break-all;">${verificationUrl}</a>
    </p>
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
    </p>
  `;

  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"FarmKonnect" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '🌾 Verify Your FarmKonnect Account',
    html: getEmailTemplate(content),
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
  
  const content = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
      Reset Your Password
    </h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi <strong>${user.name}</strong>,<br><br>
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
        Reset Password
      </a>
    </div>
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `;

  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"FarmKonnect" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '🔐 Reset Your FarmKonnect Password',
    html: getEmailTemplate(content),
  });
};

// Send welcome email after verification
const sendWelcomeEmail = async (user) => {
  const content = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
      Welcome to FarmKonnect! 🎉
    </h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi <strong>${user.name}</strong>,<br><br>
      Your email has been verified and your account is now fully activated. You can now access all features of FarmKonnect.
    </p>
    <div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #059669; font-size: 18px;">What you can do now:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
        <li>📊 View live commodity prices from 15+ cities</li>
        <li>💬 Chat directly with buyers and sellers</li>
        <li>📦 Create and manage your listings</li>
        <li>🔔 Set price alerts for your favorite commodities</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        Go to Dashboard
      </a>
    </div>
  `;

  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"FarmKonnect" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '🎉 Welcome to FarmKonnect!',
    html: getEmailTemplate(content),
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
