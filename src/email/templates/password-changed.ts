// ============================================================================
// Password Changed Security Alert Template
// ============================================================================

import { renderBaseLayout } from "../base.js";

export function renderPasswordChanged(userName = "User") {
  const subject = "Security Alert: Password Changed — Kyro CMS";
  const timestampStr = new Date().toUTCString();

  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      This email confirms that the password for your Kyro CMS account was successfully updated on <strong>${timestampStr}</strong>.
    </p>

    <!-- Security Warning Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
          ⚠️ <strong>Did not request this change?</strong><br />
          If you did not initiate this change, your account may be compromised. Reset your password immediately and contact an administrator.
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    title: "Password Updated",
    previewText: "Your Kyro CMS account password was updated.",
    badgeText: "Security Alert",
    badgeType: "warning",
    bodyHtml,
    ctaText: "Account Security",
    ctaUrl: "https://kyro-cms.com",
  });

  const text = `Security Alert: Your Kyro CMS password was updated at ${timestampStr}.\n\nIf you did not make this change, please reset your password immediately.\n\nKyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
