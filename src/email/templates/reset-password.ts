// ============================================================================
// Password Reset Template
// ============================================================================

import { renderBaseLayout } from "../base.js";

export function renderResetPassword(link: string, userName = "User") {
  const subject = "Reset your password — Kyro CMS";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      We received a request to reset the password for your account. Click the button below to choose a new password.
    </p>

    <!-- Reset Link Box -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 12px; color: #71717a; line-height: 1.5; word-break: break-all;">
          <strong>Reset URL:</strong><br />
          <a href="${link}" style="color: #09090b; text-decoration: underline;" class="email-value">${link}</a>
        </td>
      </tr>
    </table>

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      For security reasons, this link will expire in 1 hour. If you did not request a password reset, no further action is required.
    </p>
  `;

  const html = renderBaseLayout({
    title: "Reset Your Password",
    previewText: "Use this secure link to reset your Kyro CMS password.",
    badgeText: "Security Action",
    badgeType: "warning",
    bodyHtml,
    ctaText: "Reset Password",
    ctaUrl: link,
  });

  const text = `Hello ${userName},\n\nReset your password using the following link:\n${link}\n\nThis link will expire in 1 hour.\n\nKyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
