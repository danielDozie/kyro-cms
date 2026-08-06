// ============================================================================
// New Login Security Alert Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderNewLogin(location: string, time: string, userName = "User", brandConfig?: BrandConfig) {
  const subject = "Security Alert: New Sign-in to Kyro CMS";

  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      A new sign-in to your Kyro CMS account was detected.
    </p>

    <!-- Sign-in Details -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          <strong>Time:</strong> ${time}<br />
          <strong>Location/IP:</strong> ${location}
        </td>
      </tr>
    </table>

    <!-- Security Warning Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
          ⚠️ <strong>Don't recognize this activity?</strong><br />
          If you did not sign in recently, your account may be compromised. Please reset your password immediately and contact an administrator.
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "New Sign-in Detected",
    previewText: "A new sign-in was detected on your Kyro CMS account.",
    badgeText: "Security Alert",
    badgeType: "warning",
    bodyHtml,
    ctaText: "Review Account Security",
    ctaUrl: "https://kyro-cms.com",
  });

  const text = `Security Alert: New Sign-in to Kyro CMS

Hello ${userName},

A new sign-in to your account was detected at ${time} from ${location}.

If you did not sign in recently, please reset your password immediately.

Kyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
