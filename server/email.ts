import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';

// Create transporter only if email credentials are provided
let transporter: any = null;

// Initialize transporter if credentials are available
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  console.log('📧 Email service configured with Gmail');
} else {
  console.log('📧 Email service not configured - users will be auto-verified for local development');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!transporter) {
      console.warn('⚠️  Email service not configured. Email not sent to:', options.to);
      console.warn('   To enable email functionality, add GMAIL_USER and GMAIL_APP_PASSWORD to your environment variables.');
      console.warn('   For local development, users will be auto-verified to prevent account lockout.');
      return false;
    }

    await transporter.sendMail({
      from: `"VIT SwapHands" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('✅ Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    console.warn('   For local development, users will be auto-verified to prevent account lockout.');
    return false;
  }
}

export function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

export function generateOTPWithExpiry(): { otp: string; expiry: Date } {
  const otp = generateOTP();
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes
  return { otp, expiry };
}

export async function sendVerificationEmail(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - VIT SwapHands</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; color: #2563eb; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to VIT SwapHands!</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up for VIT SwapHands, the student marketplace for VIT community.</p>
          <p>To complete your registration, please use the following OTP code:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          
          <div class="warning">
            <strong>Security Notice:</strong> Never share this code with anyone. VIT SwapHands staff will never ask for your OTP code.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to VIT SwapHands!
    
    Your email verification code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't create this account, please ignore this email.
  `;

  return await sendEmail({
    to: email,
    subject: 'Verify Your Email - VIT SwapHands',
    html,
    text,
  });
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - VIT SwapHands</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; color: #dc2626; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password for your VIT SwapHands account.</p>
          <p>Please use the following OTP code to reset your password:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          
          <div class="warning">
            <strong>Security Notice:</strong> Never share this code with anyone. If you're concerned about your account security, please contact support.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request - VIT SwapHands
    
    Your password reset code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request a password reset, please ignore this email.
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - VIT SwapHands',
    html,
    text,
  });
}