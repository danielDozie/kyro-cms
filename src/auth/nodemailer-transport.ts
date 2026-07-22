import type { Transporter, SentMessageInfo } from "nodemailer";

export interface EmailConfig {
  provider: "smtp" | "resend" | "sendgrid" | "mailgun" | "ses";
  from: string;
  fromName?: string;
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  resend?: {
    apiKey: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
    region?: "us" | "eu";
  };
  ses?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailTemplates {
  verifyEmail: (
    link: string,
    userName?: string,
  ) => { subject: string; html: string; text: string };
  resetPassword: (
    link: string,
    userName?: string,
  ) => { subject: string; html: string; text: string };
  welcome: (userName?: string) => {
    subject: string;
    html: string;
    text: string;
  };
  accountLocked: (
    attempts: number,
    duration: number,
    userName?: string,
  ) => { subject: string; html: string; text: string };
  passwordChanged: (userName?: string) => {
    subject: string;
    html: string;
    text: string;
  };
  newLogin: (
    location: string,
    time: string,
    userName?: string,
  ) => { subject: string; html: string; text: string };
}

const defaultTemplates: EmailTemplates = {
  verifyEmail: (link, userName = "User") => ({
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Verify Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #0b1222; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome, ${userName}!</h1>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${link}" class="button">Verify Email</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome ${userName}!\n\nPlease verify your email by clicking this link: ${link}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
  }),

  resetPassword: (link, userName = "User") => ({
    subject: "Reset your password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Password Reset Request</h1>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${link}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </div>
          <div class="footer">
            <p>For security reasons, please don't share this email with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Password Reset Request\n\nHello ${userName},\n\nWe received a request to reset your password. Click this link to create a new password: ${link}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.`,
  }),

  welcome: (userName = "User") => ({
    subject: "Welcome to Kyro CMS",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #0b1222; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Kyro CMS, ${userName}!</h1>
          <p>Your account has been created successfully.</p>
          <p>You can now:</p>
          <ul>
            <li>Manage your content collections</li>
            <li>Upload and organize media</li>
            <li>Configure settings</li>
            <li>And much more...</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="#" class="button">Get Started</a>
          </p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to Kyro CMS, ${userName}!\n\nYour account has been created successfully.\n\nYou can now:\n- Manage your content collections\n- Upload and organize media\n- Configure settings\n- And much more...\n\nGet started by logging into your dashboard.`,
  }),

  accountLocked: (attempts, duration, userName = "User") => ({
    subject: "Account Security Alert - Account Locked",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Account Locked</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #fef2f2; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Account Security Alert</h1>
          <p>Hello ${userName},</p>
          <div class="alert">
            <p><strong>⚠️ Your account has been temporarily locked due to multiple failed login attempts.</strong></p>
            <p>Failed attempts: ${attempts}</p>
            <p>Lockout duration: ${Math.round(duration / 60000)} minutes</p>
          </div>
          <p>Your account will automatically unlock after the lockout period expires.</p>
          <p>If this wasn't you, we recommend:</p>
          <ul>
            <li>Using a strong, unique password</li>
            <li>Enabling two-factor authentication (coming soon)</li>
            <li>Reviewing your recent account activity</li>
          </ul>
          <div class="footer">
            <p>If you need immediate assistance, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Account Security Alert\n\nHello ${userName},\n\nYour account has been temporarily locked due to multiple failed login attempts (${attempts}).\n\nLockout duration: ${Math.round(duration / 60000)} minutes\n\nYour account will automatically unlock after this period.\n\nIf this wasn't you, we recommend using a strong, unique password.`,
  }),

  passwordChanged: (userName = "User") => ({
    subject: "Your password has been changed",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Password Changed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .info { background: #f0fdf4; border: 1px solid #22c55e; padding: 12px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Password Changed</h1>
          <p>Hello ${userName},</p>
          <div class="info">
            <p>Your password was recently changed.</p>
          </div>
          <p>If you did this, you can safely ignore this email.</p>
          <p><strong>If you didn't change your password</strong>, please contact our support team immediately as your account may have been compromised.</p>
        </div>
      </body>
      </html>
    `,
    text: `Password Changed\n\nHello ${userName},\n\nYour password was recently changed.\n\nIf you did this, you can safely ignore this email.\n\nIf you didn't change your password, please contact support immediately.`,
  }),

  newLogin: (location, time, userName = "User") => ({
    subject: "New login to your account",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Login</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>New Login Detected</h1>
          <p>Hello ${userName},</p>
          <p>We detected a new login to your account:</p>
          <div class="info-box">
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Time:</strong> ${time}</p>
          </div>
          <p><strong>If this was you</strong>, no action is needed.</p>
          <p><strong>If this wasn't you</strong>, your account may be compromised. Please:</p>
          <ol>
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Contact support if needed</li>
          </ol>
          <div class="footer">
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New Login Detected\n\nHello ${userName},\n\nWe detected a new login to your account:\n\nLocation: ${location}\nTime: ${time}\n\nIf this wasn't you, please change your password immediately and contact support.`,
  }),
};

import { ConfigService } from "../config/ConfigService.js";

export class EmailTransport {
  private transporter?: Transporter<SentMessageInfo>;
  private config: EmailConfig;
  private templates: EmailTemplates;
  private transporterInitialized: boolean = false;

  constructor(config: EmailConfig, templates?: Partial<EmailTemplates>) {
    this.config = config;
    this.templates = { ...defaultTemplates, ...templates };
  }

  private async ensureTransporter(): Promise<Transporter<SentMessageInfo>> {
    if (this.transporterInitialized) {
      return this.transporter!;
    }

    const { default: nodemailer } = await import("nodemailer");

    if (this.config.provider === "smtp" && this.config.smtp) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.auth,
      });
    } else if (this.config.provider === "ses" && this.config.ses) {
      this.transporter = nodemailer.createTransport({
        host: `email-smtp.${this.config.ses.region}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: {
          user: this.config.ses.accessKeyId,
          pass: this.config.ses.secretAccessKey,
        },
      });
    }

    this.transporterInitialized = true;
    return this.transporter!;
  }

  async send(options: EmailOptions): Promise<any> {
    const { provider, from, fromName, replyTo: configReplyTo } = this.config;
    const fromFull = `"${fromName || "Kyro CMS"}" <${from}>`;
    const replyTo = options.replyTo || configReplyTo;



    try {
      let result;
      switch (provider) {
        case "smtp":
        case "ses":
          {
            const transporter = await this.ensureTransporter();
            if (!transporter)
              throw new Error(`${provider} transporter not initialized`);
            result = await transporter.sendMail({
              from: fromFull,
              to: Array.isArray(options.to)
                ? options.to.join(", ")
                : options.to,
              subject: options.subject,
              html: options.html,
              text: options.text,
              replyTo,
            });
          }
          break;

        case "resend":
          result = await this.sendViaResend(fromFull, options, replyTo);
          break;

        case "sendgrid":
          result = await this.sendViaSendGrid(fromFull, options, replyTo);
          break;

        case "mailgun":
          result = await this.sendViaMailgun(fromFull, options, replyTo);
          break;

        default:
          throw new Error(`Unsupported email provider: ${provider}`);
      }

      return result;
    } catch (error: any) {
      console.error(`[EmailTransport] FAILED to send email:`, error.message);
      if (error.response) {
        console.error(
          `[EmailTransport] Provider Error Detail:`,
          JSON.stringify(error.response, null, 2),
        );
      }
      throw error;
    }
  }

  private async sendViaResend(
    from: string,
    options: EmailOptions,
    replyTo?: string,
  ) {
    const apiKey = this.config.resend?.apiKey;
    if (!apiKey) throw new Error("Resend API Key missing");

    const body = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: replyTo,
    };


    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(`Resend Error: ${JSON.stringify(error)}`);
    }
    return resp.json();
  }

  private async sendViaSendGrid(
    from: string,
    options: EmailOptions,
    replyTo?: string,
  ) {
    const apiKey = this.config.sendgrid?.apiKey;
    if (!apiKey) throw new Error("SendGrid API Key missing");

    const body = {
      personalizations: [
        {
          to: Array.isArray(options.to)
            ? options.to.map((email) => ({ email }))
            : [{ email: options.to }],
        },
      ],
      from: {
        email: from.match(/<(.+)>/)?.[1] || from,
        name: from.match(/"(.+)"/)?.[1],
      },
      subject: options.subject,
      content: [
        { type: "text/plain", value: options.text || "" },
        { type: "text/html", value: options.html },
      ],
      reply_to: replyTo ? { email: replyTo } : undefined,
    };


    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(`SendGrid Error: ${JSON.stringify(error)}`);
    }
    return { success: true };
  }

  private async sendViaMailgun(
    from: string,
    options: EmailOptions,
    replyTo?: string,
  ) {
    const { apiKey, domain, region } = this.config.mailgun || {};
    if (!apiKey || !domain) throw new Error("Mailgun config missing");

    const base = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
    const auth = btoa(`api:${apiKey}`);

    const formData = new URLSearchParams();
    formData.append("from", from);
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    formData.append("to", to);
    formData.append("subject", options.subject);
    formData.append("html", options.html);
    if (options.text) formData.append("text", options.text);
    if (replyTo) formData.append("h:Reply-To", replyTo);


    const resp = await fetch(`https://${base}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(`Mailgun Error: ${JSON.stringify(error)}`);
    }
    return resp.json();
  }

  getTemplates(): EmailTemplates {
    return this.templates;
  }

  async verifyConnection(): Promise<boolean> {
    if (this.config.provider === "smtp" || this.config.provider === "ses") {
      try {
        const transporter = await this.ensureTransporter();
        if (transporter) {
          await transporter.verify();
          return true;
        }
      } catch {
        return false;
      }
    }
    return !!(
      this.config.resend?.apiKey ||
      this.config.sendgrid?.apiKey ||
      this.config.mailgun?.apiKey
    );
  }

  static async fromConfig(db: any): Promise<EmailTransport | null> {
    const configService = new ConfigService(db);
    await configService.load();
    const config = configService.getEmailConfig();

    if (!config.provider) {
      return this.fromEnv();
    }

    const transformed: EmailConfig = {
      provider: (config.provider as any) || "smtp",
      from: config.from || "noreply@example.com",
      fromName: config.fromName,
      replyTo: config.replyTo,
      smtp:
        config.provider === "smtp"
          ? {
              host: config.host || "",
              port: config.port || 587,
              secure: config.secure || false,
              auth: { user: config.user || "", pass: config.pass || "" },
            }
          : undefined,
      resend:
        config.provider === "resend"
          ? { apiKey: config.pass || "" }
          : undefined,
      sendgrid:
        config.provider === "sendgrid"
          ? { apiKey: config.pass || "" }
          : undefined,
      mailgun:
        config.provider === "mailgun"
          ? {
              apiKey: config.pass || "",
              domain: config.host || "",
              region: (config.secure ? "eu" : "us") as any,
            }
          : undefined,
      ses:
        config.provider === "ses"
          ? {
              accessKeyId: config.user || "",
              secretAccessKey: config.pass || "",
              region: config.host || "us-east-1",
            }
          : undefined,
    };

    return new EmailTransport(transformed);
  }

  static fromEnv(): EmailTransport | null {
    const provider = (process.env.EMAIL_PROVIDER as any) || "smtp";
    const from =
      process.env.SMTP_FROM ||
      process.env.DEFAULT_FROM ||
      "noreply@example.com";
    const fromName = process.env.SMTP_FROM_NAME || "Kyro CMS";
    const replyTo = process.env.SMTP_REPLY_TO;

    if (provider === "smtp") {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!host || !user || !pass) return null;

      return new EmailTransport({
        provider: "smtp",
        from,
        fromName,
        replyTo,
        smtp: {
          host,
          port: parseInt(process.env.SMTP_PORT || "587", 10),
          secure: process.env.SMTP_SECURE === "true",
          auth: { user, pass },
        },
      });
    }

    if (provider === "resend") {
      const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
      if (!apiKey) return null;
      return new EmailTransport({
        provider: "resend",
        from,
        fromName,
        replyTo,
        resend: { apiKey },
      });
    }

    if (provider === "sendgrid") {
      const apiKey = process.env.SENDGRID_API_KEY || process.env.SMTP_PASS;
      if (!apiKey) return null;
      return new EmailTransport({
        provider: "sendgrid",
        from,
        fromName,
        replyTo,
        sendgrid: { apiKey },
      });
    }

    if (provider === "mailgun") {
      const apiKey = process.env.MAILGUN_API_KEY || process.env.SMTP_PASS;
      const domain = process.env.MAILGUN_DOMAIN || process.env.SMTP_HOST;
      if (!apiKey || !domain) return null;
      return new EmailTransport({
        provider: "mailgun",
        from,
        fromName,
        replyTo,
        mailgun: {
          apiKey,
          domain,
          region: (process.env.MAILGUN_REGION ||
            (process.env.SMTP_SECURE === "true" ? "eu" : "us")) as any,
        },
      });
    }

    if (provider === "ses") {
      const accessKeyId =
        process.env.AWS_ACCESS_KEY_ID || process.env.SMTP_USER;
      const secretAccessKey =
        process.env.AWS_SECRET_ACCESS_KEY || process.env.SMTP_PASS;
      const region =
        process.env.AWS_REGION || process.env.SMTP_HOST || "us-east-1";
      if (!accessKeyId || !secretAccessKey) return null;
      return new EmailTransport({
        provider: "ses",
        from,
        fromName,
        replyTo,
        ses: { accessKeyId, secretAccessKey, region },
      });
    }

    return null;
  }
}
