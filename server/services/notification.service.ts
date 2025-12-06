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
      from: `"AKITO Support" <${process.env.EMAIL_USER}>`,
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
  const companyName = "AKITO Support";

  const subject = `AKITO Support – Case Status Update`;

  // Inline styles for email compatibility (reusing the beautiful styles)
  const styles = {
    body: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9;",
    container: "max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
    header: "background-color: #8CB9AE; padding: 30px 20px; text-align: center;",
    logo: "max-height: 60px; object-fit: contain;",
    content: "padding: 40px 30px;",
    greeting: "font-size: 18px; color: #0f172a; margin-bottom: 20px;",
    paragraph: "margin-bottom: 20px;",
    caseCard: "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;",
    label: "color: #64748b; font-weight: 500; font-size: 14px;",
    value: "color: #0f172a; font-weight: 600; font-size: 14px; text-align: right;",
    badgeId: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #e0e7ff; color: #3730a3; font-family: monospace; letter-spacing: 0.5px;",
    badgeModel: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #e0f2fe; color: #075985;",
    badgeSerial: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fef9c3; color: #92400e;",
    badgeStatus: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #dcfce7; color: #166534;",
    badgeOldStatus: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #f1f5f9; color: #64748b; text-decoration: line-through;",
    sectionTitle: "font-weight: 700; color: #0f172a; margin-bottom: 10px; display: block;",
    explanationBox: "background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;",
    explanationText: "color: #1e40af; margin: 0; font-size: 14px;",
    footer: "text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;",
    actionArea: "text-align: center; margin-top: 30px;",
    callButton: "display: inline-block; background-color: #8CB9AE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;",
  };

  const getStatusExplanation = (status: string) => {
    switch (status) {
      case 'New Case':
        return 'Your device has been registered in our system. We are waiting to receive it.';
      case 'In Progress':
        return 'Your device is currently being inspected by our technicians.';
      case 'Awaiting Parts':
        return 'We have inspected the device and are waiting for specific parts to complete the repair.';
      case 'Repair Completed':
        return 'The repair has been successfully completed. Your device is being prepared for return.';
      case 'Shipped to Customer':
        return 'Your product has been shipped back to you. You should receive tracking info shortly.';
      default:
        return 'The status of your case has been updated.';
    }
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${styles.body}">
      <div style="${styles.container}">
        <div style="${styles.header}">
          <img src="https://res.cloudinary.com/dppivk4xs/image/upload/v1765005632/logo_h7llhd.png" alt="AKITO" style="${styles.logo}">
        </div>
        <div style="${styles.content}">
          <div style="${styles.greeting}">Hi ${customer.name},</div>
          
          <p style="${styles.paragraph}">We wanted to give you a quick update on your case.</p>
          
          <div style="${styles.caseCard}">
             <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="${styles.label}">Case ID</span>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                  <span style="${styles.badgeId}">${productCase._id}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="${styles.label}">Model</span>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                  <span style="${styles.badgeModel}">${productCase.modelNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="${styles.label}">S/N</span>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                  <span style="${styles.badgeSerial}">${productCase.serialNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="${styles.label}">Previous Status</span>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                   <span style="${styles.badgeOldStatus}">${oldStatus}</span>
                </td>
              </tr>
               <tr>
                <td style="padding: 8px 0;">
                  <span style="${styles.label}">Current Status</span>
                </td>
                <td style="padding: 8px 0; text-align: right; word-break: break-all;">
                   <span style="${styles.badgeStatus}">${newStatus}</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin: 25px 0;">
            <span style="${styles.sectionTitle}">What this means:</span>
            <div style="${styles.explanationBox}">
              <p style="${styles.explanationText}">${getStatusExplanation(newStatus)}</p>
            </div>
            
            <p style="${styles.paragraph}">We’ll continue to keep you updated as your case moves forward. If we need any additional information, we’ll reach out directly.</p>
          </div>
          
          <p style="${styles.paragraph}">If you have any questions, feel free to contact us anytime.</p>
          
          <div style="${styles.actionArea}">
            <p style="margin-bottom: 20px; font-weight: 600; color: #0f172a;">AKITO SUPPORT TEAM</p>
            
            <a href="tel:7188133001" style="${styles.callButton}">
              <span style="display: inline-block; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.18); text-align: center; line-height: 22px; margin-right: 8px; font-size: 13px;">&#9743;</span>
              <span style="vertical-align: middle; font-weight: 600; letter-spacing: 0.03em;">718-813-3001</span>
            </a>
          </div>
        </div>
        <div style="${styles.footer}">
          <p>&copy; Rinko USA Inc. dba AKITO</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
AKITO Support – Case Status Update

Hi ${customer.name},

We wanted to give you a quick update on your case.

Case ID: ${productCase._id}
Model: ${productCase.modelNumber}
S/N: ${productCase.serialNumber}
Previous Status: ${oldStatus}
Current Status: ${newStatus}

What this means:
${getStatusExplanation(newStatus)}

We’ll continue to keep you updated as your case moves forward.

Thank you,
AKITO SUPPORT TEAM
718-813-3001

© Rinko USA Inc. dba AKITO
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
  status: string,
  caseId: string
): Promise<boolean> {
  if (!emailTransporter) {
    console.log('📧 Email notification skipped: Service not configured');
    return false;
  }

  // Handle empty fields with fallback
  const displayModel = modelNumber || "to be provided";
  const displaySerial = serialNumber || "to be provided";
  const displayStatus = status || "to be provided";
  const displayCaseId = caseId || "to be provided";

  // Inline styles for email compatibility
  const styles = {
    body: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9;",
    container: "max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
    header: "background-color: #8CB9AE; padding: 30px 20px; text-align: center;",
    logo: "max-height: 60px; object-fit: contain;",
    content: "padding: 40px 30px;",
    greeting: "font-size: 18px; color: #0f172a; margin-bottom: 20px;",
    paragraph: "margin-bottom: 20px;",
    caseCard: "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;",
    infoRow: "display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;",
    infoRowLast: "display: flex; justify-content: space-between; padding: 8px 0; border-bottom: none;",
    label: "color: #64748b; font-weight: 500; font-size: 14px;",
    value: "color: #0f172a; font-weight: 600; font-size: 14px; text-align: right;",
    badgeId: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #e0e7ff; color: #3730a3; font-family: monospace; letter-spacing: 0.5px;",
    badgeModel: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #e0f2fe; color: #075985;",
    badgeSerial: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fef9c3; color: #92400e;",
    badgeStatus: "display: inline-block; max-width: 100%; word-break: break-all; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #dcfce7; color: #166534;",
    sectionTitle: "font-weight: 700; color: #0f172a; margin-bottom: 10px; display: block;",
    list: "padding-left: 20px; margin: 0;",
    listItem: "margin-bottom: 8px; color: #475569;",
    footer: "text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;",
    actionArea: "text-align: center; margin-top: 30px;",
    callButton: "display: inline-block; background-color: #8CB9AE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;",
  };

  try {
    const mailOptions = {
      from: `"AKITO Support" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `AKITO Support – Case Opened`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${styles.body}">
          <div style="${styles.container}">
            <div style="${styles.header}">
              <img src="https://res.cloudinary.com/dppivk4xs/image/upload/v1765005632/logo_h7llhd.png" alt="AKITO" style="${styles.logo}">
            </div>
            <div style="${styles.content}">
              <div style="${styles.greeting}">Hi ${customerName} 👋,</div>
              
              <p style="${styles.paragraph}">Thank you for contacting AKITO Support. We’ve opened a case for your product and will guide you through each step.</p>
              
              <div style="${styles.caseCard}">
                <!-- Using table for better layout support in older email clients -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="${styles.label}">Case ID</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                      <span style="${styles.badgeId}">${displayCaseId}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="${styles.label}">Model</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                      <span style="${styles.badgeModel}">${displayModel}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="${styles.label}">Serial Number</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; word-break: break-all;">
                      <span style="${styles.badgeSerial}">${displaySerial}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="${styles.label}">Status</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right; word-break: break-all;">
                       <span style="${styles.badgeStatus}">${displayStatus}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin: 25px 0;">
                <span style="${styles.sectionTitle}">Next Steps</span>
                <ul style="${styles.list}">
                  <li style="${styles.listItem}">We’ll notify you as soon as we receive your device.</li>
                  <li style="${styles.listItem}">Our team will inspect it and keep you updated throughout the process.</li>
                  <li style="${styles.listItem}">The full process may take up to 14 business days.</li>
                </ul>
              </div>
              
              <p style="${styles.paragraph}">Feel free to contact us if you have any questions. 😊 Have a great day! 🌟</p>
              
              <div style="${styles.actionArea}">
                <p style="margin-bottom: 20px; font-weight: 600; color: #0f172a;">AKITO SUPPORT TEAM</p>
                
                <a href="tel:7188133001" style="${styles.callButton}">
                 <span style="display: inline-block; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.18); text-align: center; line-height: 22px; margin-right: 8px; font-size: 13px;">&#9743;</span>
                 <span style="vertical-align: middle; font-weight: 600; letter-spacing: 0.03em;">718-813-3001</span>
                </a>
              </div>
            </div>
            <div style="${styles.footer}">
              <p>&copy; Rinko USA Inc. dba AKITO</p>
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
