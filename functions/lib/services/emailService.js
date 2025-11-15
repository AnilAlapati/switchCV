"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Email Service for user/recruiter communication
 * Handles email sending with templating system
 */
class EmailService {
    constructor() {
        // Initialize nodemailer transporter
        // For production, use SendGrid, Mailgun, or similar
        const gmailUser = process.env.GMAIL_USER || "noreply@switchcv.com";
        const gmailPassword = process.env.GMAIL_APP_PASSWORD || "";
        this.fromEmail = gmailUser;
        this.fromName = "SwitchCV";
        // Using Gmail SMTP (or configure with your email provider)
        this.transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPassword,
            },
        });
    }
    /**
     * Send email with template
     */
    async sendEmail(options) {
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
            const info = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                timestamp: new Date(),
            };
        }
        catch (error) {
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
    async sendBulkEmails(recipients, template, data) {
        return Promise.all(recipients.map((to) => this.sendEmail({
            to,
            template: template,
            data,
        })));
    }
    /**
     * Get email template
     */
    getTemplate(templateName) {
        const templates = {
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
                subject: "Welcome to SwitchCV - Get Started Today",
                text: `Welcome to SwitchCV! Start creating your professional profile to connect with opportunities.`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to SwitchCV!</h2>
            <p>Hi {{firstName}},</p>
            <p>Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.</p>
            <p><strong>Here's what you can do:</strong></p>
            <ul>
              <li>Create your professional profile</li>
              <li>Upload and manage your resumes</li>
              <li>View profile analytics and recruiter interest</li>
              <li>Control access to your information</li>
            </ul>
            <p>
              <a href="{{onboardingUrl}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Complete Your Profile
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
    renderTemplate(template, data) {
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
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log("Email service configured successfully");
            return true;
        }
        catch (error) {
            console.error("Email service configuration error:", error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
// Export singleton instance
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map