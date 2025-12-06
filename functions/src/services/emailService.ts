// Lazy loaded import
// import nodemailer from "nodemailer";
import {
  EmailTemplate,
  EmailOptions,
  EmailResult,
  CustomEmailOptions,
} from "../types/email";

/**
 * Email Service for user/recruiter communication
 * Handles email sending with templating system
 */
export class EmailService {
  private transporter: any; // Type: nodemailer.Transporter
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const smtpUser = process.env.SMTP_USER || "support@switchcv.com";
    this.fromEmail = smtpUser;
    this.fromName = "SwitchCV";
  }

  private async getTransporter() {
    if (!this.transporter) {
      const nodemailer = (await import("nodemailer")).default;

      const smtpHost = process.env.SMTP_HOST || "smtp.titan.email";
      const smtpPort = parseInt(process.env.SMTP_PORT || "465");
      const smtpUser = process.env.SMTP_USER || "support@switchcv.com";
      const smtpPass = process.env.SMTP_PASS || "";

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Send a custom email without using the templating system
   */
  async sendCustomEmail(options: CustomEmailOptions): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ""),
      };

      const transporter = await this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Custom email sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send email with template
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const template = this.getTemplate(options.template);
      const html = this.renderTemplate(template, options.data);

      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: template.subject,
        html: html,
        text: template.text, // Fallback plain text
      };

      const transporter = await this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Email sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    recipients: string[],
    template: string,
    data: Record<string, any>
  ): Promise<EmailResult[]> {
    return Promise.all(
      recipients.map((to) =>
        this.sendEmail({
          to,
          template: template as any,
          data,
        })
      )
    );
  }

  /**
   * Get email template
   */
  private getTemplate(templateName: string): EmailTemplate {
    const templates: Record<string, EmailTemplate> = {
      recruiterRequest: {
        subject: "New Recruiter Access Request - SwitchCV",
        text: `A recruiter has requested access to your profile. Please review and approve or deny the request in your dashboard.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recruiter Access Request</h2>
            <p>A recruiter has requested access to your profile for a potential opportunity.</p>
            <p><strong>Company:</strong> {{companyName}}</p>
            <p><strong>Position:</strong> {{position}}</p>
            <p><strong>Message:</strong></p>
            <p>{{message}}</p>
            <p>
              <a href="{{dashboardUrl}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Request
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">You can manage your notification preferences in your dashboard settings.</p>
          </div>
        `,
      },
      requestApproved: {
        subject: "Your Access Request Has Been Approved - SwitchCV",
        text: `Your request to access a profile has been approved.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Access Request Approved ✓</h2>
            <p>Good news! Your request to access <strong>{{candidateName}}</strong>'s profile has been approved.</p>
            <p>
              <a href="{{profileUrl}}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Profile
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">This access is valid for 30 days from approval date.</p>
          </div>
        `,
      },
      requestDenied: {
        subject: "Your Access Request Has Been Declined - SwitchCV",
        text: `Your request to access a profile has been declined.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Access Request Declined</h2>
            <p>The candidate has declined your request to access their profile.</p>
            <p style="color: #666; font-size: 14px;">You can try reaching out with another request in the future. Consider personalizing your message to increase chances of approval.</p>
            <p>
              <a href="{{dashboardUrl}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Return to Dashboard
              </a>
            </p>
          </div>
        `,
      },
      profileViewed: {
        subject: "Your Profile Was Viewed - SwitchCV",
        text: `Your profile has been viewed {{viewCount}} time(s) this week.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Profile Activity</h2>
            <p>Your profile has been viewed <strong>{{viewCount}}</strong> time(s) this week!</p>
            <p style="color: #666; font-size: 14px;">Keep your profile updated to maintain recruiter interest.</p>
            <p>
              <a href="{{dashboardUrl}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Analytics
              </a>
            </p>
          </div>
        `,
      },
      passwordReset: {
        subject: "Reset Your SwitchCV Password",
        text: `Click the link below to reset your password. This link expires in 1 hour.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your SwitchCV password.</p>
            <p>
              <a href="{{resetLink}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      },
      welcomeEmail: {
        subject: "Welcome to SwitchCV - Verify your Email",
        text: `Welcome to SwitchCV! Please verify your email address: {{verificationUrl}}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to SwitchCV!</h2>
            <p>Hi {{firstName}},</p>
            <p>Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin-top: 0;"><strong>Please verify your email address to get started:</strong></p>
              <p>
                <a href="{{verificationUrl}}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Verify Email
                </a>
              </p>
            </div>

            <p><strong>Here's what you can do next:</strong></p>
            <ul>
              <li>Create your professional profile</li>
              <li>Upload and manage your resumes</li>
              <li>View profile analytics and recruiter interest</li>
              <li>Control access to your information</li>
            </ul>
            <p>
              <a href="{{onboardingUrl}}" style="color: #3b82f6; text-decoration: none;">
                Go to Dashboard
              </a>
            </p>
          </div>
        `,
      },
      adminNotification: {
        subject: "Admin Alert: {{alertType}} - SwitchCV",
        text: `An admin notification requires your attention.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Admin Alert</h2>
            <p><strong>Type:</strong> {{alertType}}</p>
            <p><strong>Details:</strong></p>
            <p>{{details}}</p>
            <p>
              <a href="{{adminUrl}}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Review in Admin Panel
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">Timestamp: {{timestamp}}</p>
          </div>
        `,
      },
    };

    if (!templates[templateName]) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    return templates[templateName];
  }

  /**
   * Render template with data
   */
  private renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): string {
    let html = template.html;

    // Replace all {{variable}} with data values
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, String(value || ""));
    });

    return html;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      console.log("Email service configured successfully");
      return true;
    } catch (error) {
      console.error("Email service configuration error:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
