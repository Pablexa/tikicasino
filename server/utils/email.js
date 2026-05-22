import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

// Create transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Email sending disabled.');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendVerificationEmail = async (email, nickname, token) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    if (isDev) {
      console.log(`\n📧 EMAIL VERIFICATION (DEV MODE)`);
      console.log(`To: ${email}`);
      console.log(`Verification Link: ${process.env.CLIENT_URL}/verify-email/${token}`);
      console.log(`\n`);
    }
    return;
  }

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TikiCasino" <noreply@tikicasino.com>',
    to: email,
    subject: 'Verify your TikiCasino account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #000; color: #fff; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1e1e1e; border-radius: 12px; padding: 40px; }
          .logo { text-align: center; margin-bottom: 30px; }
          h1 { color: #5cff82; font-size: 24px; margin-bottom: 20px; }
          p { color: #a0a0a0; line-height: 1.6; margin-bottom: 20px; }
          .button { display: inline-block; background: #5cff82; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .warning { background: rgba(255, 92, 92, 0.1); border: 1px solid rgba(255, 92, 92, 0.2); padding: 16px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #555; font-size: 12px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>🎰 TIKICASINO</h1>
          </div>
          <h1>Welcome, ${nickname}!</h1>
          <p>Thank you for registering at TikiCasino. Click the button below to verify your email and start playing:</p>
          <center>
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </center>
          <p>Or copy and paste this link: <br/><a href="${verificationUrl}" style="color: #5cff82;">${verificationUrl}</a></p>
          <div class="warning">
            <strong>⚠️ IMPORTANT</strong><br/>
            This is a FAKE casino simulator. FCOINS have NO real value. No real money, crypto, deposits, or withdrawals are supported. This platform is for entertainment only.
          </div>
          <div class="footer">
            If you didn't create this account, please ignore this email.
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};
