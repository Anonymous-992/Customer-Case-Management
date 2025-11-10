import nodemailer from 'nodemailer';
import twilio from 'twilio';
import type { ICustomer } from '../models/Customer';
import type { IProductCase } from '../models/ProductCase';

// Email transporter configuration
let emailTransporter: nodemailer.Transporter | null = null;

// Twilio client configuration
let twilioClient: twilio.Twilio | null = null;

// Initialize email service (Nodemailer with Gmail/SMTP)
export function initializeEmailService() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️  Email notification disabled: EMAIL_USER and EMAIL_PASSWORD not configured');
    return;
  }

  try {
    if (emailService === 'gmail') {
      // Gmail configuration (requires App Password)
      emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
    } else if (smtpHost && smtpPort) {
      // Generic SMTP configuration
      emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
    } else {
      console.warn('⚠️  Email notification disabled: Invalid email configuration');
      return;
    }

    // Verify connection
    emailTransporter.verify((error) => {
      if (error) {
        console.error('❌ Email service verification failed:', error.message);
        emailTransporter = null;
      } else {
        console.log('✅ Email notification service initialized');
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to initialize email service:', error.message);
  }
}

// Initialize SMS service (Twilio)
export function initializeSMSService() {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn('⚠️  SMS notification disabled: Twilio credentials not configured');
    return;
  }

  try {
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    console.log('✅ SMS notification service initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize SMS service:', error.message);
  }
}

// Send email notification
export async function sendEmailNotification(
  customer: ICustomer,
  productCase: IProductCase,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  if (!emailTransporter) {
    console.log('📧 Email notification skipped: Service not configured');
    return false;
  }

  if (!customer.notificationPreferences?.email) {
    console.log('📧 Email notification skipped: Customer preference disabled');
    return false;
  }

  try {
    const emailContent = generateEmailContent(customer, productCase, oldStatus, newStatus);
    
    const info = await emailTransporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'Case Management System'}" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log(`✅ Email sent to ${customer.email}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${customer.email}:`, error.message);
    return false;
  }
}

// Send SMS notification
export async function sendSMSNotification(
  customer: ICustomer,
  productCase: IProductCase,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  if (!twilioClient) {
    console.log('📱 SMS notification skipped: Service not configured');
    return false;
  }

  if (!customer.notificationPreferences?.sms) {
    console.log('📱 SMS notification skipped: Customer preference disabled');
    return false;
  }

  try {
    const smsContent = generateSMSContent(customer, productCase, newStatus);
    
    const message = await twilioClient.messages.create({
      body: smsContent,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: customer.phone,
    });

    console.log(`✅ SMS sent to ${customer.phone}: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send SMS to ${customer.phone}:`, error.message);
    return false;
  }
}

// Send notification (both email and SMS based on preferences)
export async function sendCaseStatusNotification(
  customer: ICustomer,
  productCase: IProductCase,
  oldStatus: string,
  newStatus: string
): Promise<{ email: boolean; sms: boolean }> {
  const results = {
    email: false,
    sms: false,
  };

  // Send notifications in parallel
  const [emailResult, smsResult] = await Promise.allSettled([
    sendEmailNotification(customer, productCase, oldStatus, newStatus),
    sendSMSNotification(customer, productCase, oldStatus, newStatus),
  ]);

  if (emailResult.status === 'fulfilled') {
    results.email = emailResult.value;
  }

  if (smsResult.status === 'fulfilled') {
    results.sms = smsResult.value;
  }

  return results;
}

// Generate email content
function generateEmailContent(
  customer: ICustomer,
  productCase: IProductCase,
  oldStatus: string,
  newStatus: string
) {
  const companyName = process.env.COMPANY_NAME || 'Case Management System';
  
  const subject = `Case Status Update: ${productCase.modelNumber} - ${newStatus}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 10px 0; }
    .status-old { background-color: #fee2e2; color: #991b1b; }
    .status-new { background-color: #dcfce7; color: #166534; }
    .case-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #4b5563; }
    .value { color: #1f2937; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Case Status Update</p>
    </div>
    <div class="content">
      <p>Dear ${customer.name},</p>
      
      <p>We're writing to inform you that the status of your case has been updated.</p>
      
      <div class="case-details">
        <h3 style="margin-top: 0; color: #2563eb;">Case Information</h3>
        <div class="detail-row">
          <span class="label">Product Model:</span>
          <span class="value">${productCase.modelNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Serial Number:</span>
          <span class="value">${productCase.serialNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Previous Status:</span>
          <span class="status-badge status-old">${oldStatus}</span>
        </div>
        <div class="detail-row">
          <span class="label">Current Status:</span>
          <span class="status-badge status-new">${newStatus}</span>
        </div>
        <div class="detail-row">
          <span class="label">Issue:</span>
          <span class="value">${productCase.repairNeeded}</span>
        </div>
      </div>
      
      ${getStatusMessage(newStatus)}
      
      <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
      
      <p>Thank you for your patience.</p>
      
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>${companyName}</strong>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
${companyName} - Case Status Update

Dear ${customer.name},

Your case status has been updated:

Product Model: ${productCase.modelNumber}
Serial Number: ${productCase.serialNumber}
Previous Status: ${oldStatus}
Current Status: ${newStatus}
Issue: ${productCase.repairNeeded}

${getStatusMessage(newStatus, true)}

If you have any questions, please contact us.

Best regards,
${companyName}

---
This is an automated notification.
  `.trim();

  return { subject, html, text };
}

// Generate SMS content (short version)
function generateSMSContent(
  customer: ICustomer,
  productCase: IProductCase,
  newStatus: string
): string {
  const companyName = process.env.COMPANY_NAME || 'CMS';
  return `${companyName}: Your case for ${productCase.modelNumber} (S/N: ${productCase.serialNumber}) status updated to "${newStatus}". ${getStatusMessageShort(newStatus)}`;
}

// Get status-specific message
function getStatusMessage(status: string, plainText: boolean = false): string {
  const messages: Record<string, string> = {
    'New Case': plainText 
      ? 'Your case has been received and assigned to our team. We will begin processing it shortly.'
      : '<p style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">Your case has been received and assigned to our team. We will begin processing it shortly.</p>',
    'In Progress': plainText
      ? 'Your case is currently being worked on by our technicians. We will keep you updated on the progress.'
      : '<p style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">Your case is currently being worked on by our technicians. We will keep you updated on the progress.</p>',
    'Awaiting Parts': plainText
      ? 'We are waiting for replacement parts to arrive. Your case will resume once the parts are available.'
      : '<p style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">We are waiting for replacement parts to arrive. Your case will resume once the parts are available.</p>',
    'Repair Completed': plainText
      ? 'Great news! The repair work has been completed. Your device is ready for shipping or pickup.'
      : '<p style="background-color: #dcfce7; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a;">Great news! The repair work has been completed. Your device is ready for shipping or pickup.</p>',
    'Shipped to Customer': plainText
      ? 'Your device has been shipped and is on its way to you. You should receive it soon.'
      : '<p style="background-color: #dcfce7; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a;">Your device has been shipped and is on its way to you. You should receive it soon.</p>',
    'Closed': plainText
      ? 'This case has been closed. Thank you for your business!'
      : '<p style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #6b7280;">This case has been closed. Thank you for your business!</p>',
  };

  return messages[status] || '';
}

// Get short status message for SMS
function getStatusMessageShort(status: string): string {
  const messages: Record<string, string> = {
    'New Case': 'Case received and assigned.',
    'In Progress': 'Work in progress.',
    'Awaiting Parts': 'Waiting for parts.',
    'Repair Completed': 'Repair done!',
    'Shipped to Customer': 'Shipped to you.',
    'Closed': 'Case closed.',
  };

  return messages[status] || '';
}

// Send email notification when new case is created
export async function sendCaseCreatedEmail(
  customerEmail: string,
  customerName: string,
  modelNumber: string,
  serialNumber: string,
  status: string
): Promise<boolean> {
  if (!emailTransporter) {
    console.log('📧 Email notification skipped: Service not configured');
    return false;
  }

  const companyName = process.env.COMPANY_NAME || 'Case Management System';

  try {
    const mailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `New Case Created - ${modelNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .case-details { background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .status-new { background-color: #dbeafe; color: #1e40af; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Case Created Successfully</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Your repair case has been successfully created in our system. We have received your device and our team will begin processing it shortly.</p>
              
              <div class="case-details">
                <h2 style="margin-top: 0; color: #2563eb;">Case Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Product Model:</span>
                  <span class="detail-value">${modelNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Serial Number:</span>
                  <span class="detail-value">${serialNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value"><span class="status-badge status-new">${status}</span></span>
                </div>
              </div>

              ${getStatusMessage(status)}
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Our technicians will inspect your device</li>
                <li>We'll keep you updated on the progress via email</li>
                <li>You can contact us anytime if you have questions</li>
              </ul>
              
              <p>Thank you for choosing ${companyName}!</p>
              
              <p>Best regards,<br>${companyName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Case creation email sent to ${customerEmail}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send case creation email:', error.message);
    return false;
  }
}

// Initialize services on module load
initializeEmailService();
initializeSMSService();
