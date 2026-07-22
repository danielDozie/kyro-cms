// ============================================================================
// Email Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const emailSettingsGlobal: GlobalConfig = {
  slug: "email-settings",
  label: "Email Settings",

  admin: {
    group: "settings",
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "fromName",
      type: "text",
      label: "From Name",
      admin: {},
    },
    {
      name: "fromEmail",
      type: "email",
      label: "From Email",
      required: true,
      admin: {},
    },
    {
      name: "replyTo",
      type: "email",
      label: "Reply-To Email",
      admin: {},
    },
    {
      name: "provider",
      type: "select",
      label: "Email Provider",
      defaultValue: "smtp",
      options: [
        { label: "SMTP (Standard)", value: "smtp" },
        { label: "Resend", value: "resend" },
        { label: "SendGrid", value: "sendgrid" },
        { label: "Mailgun", value: "mailgun" },
        { label: "AWS SES", value: "ses" },
      ],
    },
    {
      name: "smtp",
      type: "group",
      label: "SMTP Settings",
      admin: {
        condition: { field: "provider", equals: "smtp" },
      },
      fields: [
        {
          name: "smtpService",
          type: "select",
          label: "SMTP Service",
          defaultValue: "custom",
          options: [
            { label: "Custom SMTP", value: "custom" },
            { label: "Gmail", value: "gmail" },
            { label: "Outlook / Office 365", value: "outlook" },
            { label: "Brevo (Sendinblue)", value: "brevo" },
            { label: "Mailgun (SMTP)", value: "mailgun-smtp" },
            { label: "SendGrid (SMTP)", value: "sendgrid-smtp" },
            { label: "Mandrill / Mailchimp", value: "mandrill" },
          ],
          admin: {
            description:
              "Selecting a known service will pre-configure host and port settings.",
          },
        },
        {
          name: "host",
          type: "text",
          label: "Host",
          admin: {
            condition: { field: "smtpService", equals: "custom" },
            placeholder: "smtp.example.com",
          },
        },
        {
          name: "port",
          type: "number",
          label: "Port",
          defaultValue: 587,
          admin: {
            condition: { field: "smtpService", equals: "custom" },
          },
        },
        {
          name: "username",
          type: "text",
          label: "Username",
        },
        {
          name: "password",
          type: "password",
          label: "Password",
        },
        {
          name: "secure",
          type: "checkbox",
          label: "Use TLS/SSL",
          defaultValue: true,
        },
      ],
    },
    {
      name: "resend",
      type: "group",
      label: "Resend Settings",
      admin: {
        condition: { field: "provider", equals: "resend" },
      },
      fields: [
        {
          name: "apiKey",
          type: "password",
          label: "API Key",
          required: true,
        },
      ],
    },
    {
      name: "sendgrid",
      type: "group",
      label: "SendGrid Settings",
      admin: {
        condition: { field: "provider", equals: "sendgrid" },
      },
      fields: [
        {
          name: "apiKey",
          type: "password",
          label: "API Key",
          required: true,
        },
      ],
    },
    {
      name: "mailgun",
      type: "group",
      label: "Mailgun Settings",
      admin: {
        condition: { field: "provider", equals: "mailgun" },
      },
      fields: [
        {
          name: "apiKey",
          type: "password",
          label: "API Key",
          required: true,
        },
        {
          name: "domain",
          type: "text",
          label: "Domain",
          required: true,
        },
        {
          name: "region",
          type: "select",
          label: "Region",
          defaultValue: "us",
          options: [
            { label: "US (United States)", value: "us" },
            { label: "EU (Europe)", value: "eu" },
          ],
        },
      ],
    },
    {
      name: "ses",
      type: "group",
      label: "AWS SES Settings",
      admin: {
        condition: { field: "provider", equals: "ses" },
      },
      fields: [
        {
          name: "accessKeyId",
          type: "text",
          label: "Access Key ID",
          required: true,
        },
        {
          name: "secretAccessKey",
          type: "password",
          label: "Secret Access Key",
          required: true,
        },
        {
          name: "region",
          type: "text",
          label: "Region",
          defaultValue: "us-east-1",
          admin: { placeholder: "us-east-1" },
        },
      ],
    },
    {
      name: "testEmailSection",
      type: "row",
      label: "Test Email",
      admin: {
        description: "Enter an email address to send a test email.",
      },
      fields: [
        {
          name: "testEmail",
          type: "email",
          label: "Email",
          admin: {
            width: "300px",
          },
        },
        {
          name: "sendTestEmail",
          type: "action",
          label: "Send Test Email",
          admin: {
            action: "/api/globals/email-settings/test",
            method: "POST",
          },
        },
      ],
    },
  ],
};
