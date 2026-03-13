import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  EmailTemplate,
  EmailOptions,
  EmailResult,
  CustomEmailOptions,
  EmailTemplateName,
} from "../types/email";

/**
 * Email Service — single delivery path for all system emails.
 *
 * Every method writes a document to the Firestore `mail` collection. The
 * Firebase firestore-send-email extension picks it up and delivers via
 * Gmail SMTP (switchcvs@gmail.com). This is the only working, credentialed
 * email path in production — no direct SMTP, no extra secrets required.
 */
export class EmailService {
  private readonly mailCollection = "mail";

  private async writeToMailCollection(doc: {
    to: string | string[];
    message: { subject: string; html: string; text: string };
  }): Promise<string> {
    const ref = await admin
      .firestore()
      .collection(this.mailCollection)
      .add({ ...doc, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return ref.id;
  }

  /**
   * Send a custom email without using the templating system
   */
  async sendCustomEmail(options: CustomEmailOptions): Promise<EmailResult> {
    try {
      const docId = await this.writeToMailCollection({
        to: options.to,
        message: {
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]+>/g, ""),
        },
      });
      return { success: true, messageId: docId, timestamp: new Date() };
    } catch (error) {
      functions.logger.error("Custom email queuing failed:", error);
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
      const docId = await this.writeToMailCollection({
        to: options.to,
        message: {
          subject: this.renderString(template.subject, options.data),
          html: this.renderString(template.html, options.data),
          text: this.renderString(template.text, options.data),
        },
      });
      return { success: true, messageId: docId, timestamp: new Date() };
    } catch (error) {
      functions.logger.error("Email queuing failed:", error);
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
    template: EmailTemplateName,
    data: Record<string, any>,
  ): Promise<EmailResult[]> {
    return Promise.all(
      recipients.map((to) => this.sendEmail({ to, template, data })),
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

  private renderString(str: string, data: Record<string, any>): string {
    return Object.entries(data).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
    }, str);
  }

  /**
   * Verify email service availability (checks Firestore connectivity)
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await admin.firestore().collection(this.mailCollection).limit(1).get();
      functions.logger.info("Email service (Firestore path) is ready");
      return true;
    } catch (error) {
      functions.logger.error("Email service Firestore check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
