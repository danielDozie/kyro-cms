// ============================================================================
// Email Verification Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderVerifyEmail(link: string, userName = "User", brandConfig?: BrandConfig) {
  const subject = "Confirm your email address — Kyro CMS";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Thank you for registering. Please confirm your email address by clicking the verification button below to activate your account.
    </p>

    <!-- Verification Token Link Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 12px; color: #71717a; line-height: 1.5; word-break: break-all;">
          <strong>Direct link:</strong><br />
          <a href="${link}" style="color: #09090b; text-decoration: underline;" class="email-value">${link}</a>
        </td>
      </tr>
    </table>

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Confirm Your Email Address",
    previewText: "Please confirm your email address to activate your Kyro CMS account.",
    bodyHtml,
    ctaText: "Confirm Email Address",
    ctaUrl: link,
    secondaryCtaText: "Documentation",
    secondaryCtaUrl: "https://kyro-cms.com/docs",
  });

  const text = `Welcome, ${userName}!

Please verify your email address by visiting:
${link}

This link expires in 24 hours.

Kyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
