// TikiCasino - Email Service
// Supports: development mode (console log), SMTP (Nodemailer), Brevo SMTP

import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV !== 'production';
const emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send verification email to user
 * In dev mode (no SMTP configured), logs the verification link to console
 */
export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  if (!emailConfigured || isDev) {
    // Development mode: show in console
    console.log('\n========================================');
    console.log('DEV MODE: Email Verification');
    console.log(`Email: ${email}`);
    console.log(`Token: ${token}`);
    console.log(`Verification URL: ${verifyUrl}`);
    console.log('========================================\n');
    return { success: true, dev: true };
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'TikiCasino'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your TikiCasino account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22d3ee; font-size: 32px; margin: 0;">TikiCasino</h1>
            <p style="color: #6b7280; margin: 8px 0 0;">Play fake. Win fake. Flex real.</p>
          </div>
          
          <h2 style="color: #ffffff; font-size: 20px;">Verify your email address</h2>
          <p style="color: #9ca3af;">Click the button below to verify your email and claim your 10,000 FCOINS welcome bonus.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Verify Email & Get 10,000 FCOINS
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Or paste this link in your browser:</p>
          <p style="color: #22d3ee; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
          
          <div style="border-top: 1px solid #1f1f1f; margin-top: 32px; padding-top: 24px;">
            <p style="color: #4b5563; font-size: 12px; text-align: center;">
              ⚠️ TikiCasino is a fake casino simulator. FCOINS have no real value. 
              No real money, crypto, deposits or withdrawals are supported.
            </p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return { success: false, error: err.message };
  }
}
