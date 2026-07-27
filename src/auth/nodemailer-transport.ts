import type { Transporter, SentMessageInfo } from "nodemailer";
import { getEmailTemplates } from "../email/index.js";
import { ConfigService } from "../config/ConfigService.js";

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

const defaultTemplates: EmailTemplates = getEmailTemplates() as unknown as EmailTemplates;

export class EmailTransport {
  private transporter?: Transporter<SentMessageInfo>;
  private config: EmailConfig;
  private templates: EmailTemplates;
  private transporterInitialized: boolean = false;

  constructor(config: EmailConfig, templates?: Partial<EmailTemplates>) {
    this.config = config;
    this.templates = { ...getEmailTemplates(), ...templates } as unknown as EmailTemplates;
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
