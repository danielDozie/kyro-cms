// ============================================================================
// Magic Link / Passwordless Authentication Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderMagicLink(link: string, code?: string, userName = "User", brandConfig?: BrandConfig) {
  const subject = "Your one-time login link — Kyro CMS";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Click the button below to sign in to your Kyro CMS account without entering a password.
    </p>

    ${
      code
        ? `
    <!-- One-Time Passcode Box -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 16px; text-align: center;">
      <tr>
        <td style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          One-Time Passcode
        </td>
      </tr>
      <tr>
        <td style="font-size: 28px; font-weight: 800; font-family: monospace; color: #09090b; letter-spacing: 4px;" class="email-code-box">
          ${code}
        </td>
      </tr>
    </table>`
        : ""
    }

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      This single-use link will expire in 10 minutes. Never share authentication links with anyone.
    </p>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Sign in to Kyro CMS",
    previewText: "Your secure magic login link for Kyro CMS.",
    bodyHtml,
    ctaText: "Sign In Now",
    ctaUrl: link,
  });

  const text = `Hello ${userName},

Sign in to Kyro CMS using the link below:
${link}${
    code
      ? `

Or enter code: ${code}`
      : ""
  }

This link expires in 10 minutes.

Kyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
