// ============================================================================
// Account Lockout Security Template
// ============================================================================

import { renderBaseLayout } from "../base.js";

export function renderAccountLocked(attempts: number, durationMinutes: number, userName = "User") {
  const subject = "Security Alert: Account Temporarily Locked — Kyro CMS";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Your Kyro CMS account was temporarily locked after <strong>${attempts} failed login attempts</strong>.
    </p>

    <!-- Lockout Notice Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #b45309; line-height: 1.5;">
          🔒 <strong>Lockout duration:</strong> ${durationMinutes} minutes.<br />
          You may try logging in again after the cooling-off period expires.
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    title: "Account Temporarily Locked",
    previewText: "Your Kyro CMS account was locked due to multiple failed login attempts.",
    badgeText: "Security Lockout",
    badgeType: "warning",
    bodyHtml,
    ctaText: "Unlock Instructions",
    ctaUrl: "https://kyro-cms.com/docs",
  });

  const text = `Security Alert: Account temporarily locked for ${userName} after ${attempts} failed login attempts. Unlocks in ${durationMinutes} minutes.\n\nKyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
