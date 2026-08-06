// ============================================================================
// Welcome Email Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderWelcome(userName = "User", appUrl = "https://kyro-cms.com", brandConfig?: BrandConfig) {
  const subject = "Welcome to Kyro CMS!";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Welcome <strong class="email-strong" style="color: #09090b;">${userName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Your Kyro CMS account is now set up and ready to go. You can access your admin dashboard, build content collections, and manage schema endpoints.
    </p>

    <!-- Key Capabilities List -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px; padding: 16px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          🚀 <strong>What you can do next:</strong>
          <ul style="margin: 8px 0 0; padding-left: 20px; color: #52525b;">
            <li>Define collections & custom field schemas in <code style="font-family: monospace;">kyro.config.ts</code></li>
            <li>Explore auto-generated REST, GraphQL, tRPC & WebSocket endpoints</li>
            <li>Customize your visual Admin dashboard & branding settings</li>
          </ul>
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Welcome to Kyro CMS",
    previewText: "Your account is verified and ready. Start building content applications.",
    badgeText: "Account Ready",
    badgeType: "success",
    bodyHtml,
    ctaText: "Open Dashboard",
    ctaUrl: appUrl,
    secondaryCtaText: "Documentation",
    secondaryCtaUrl: "https://kyro-cms.com/docs",
  });

  const text = `Welcome to Kyro CMS, ${userName}!

Your account is active. Log in at ${appUrl} to start building.

Documentation: https://kyro-cms.com/docs`;

  return { subject, html, text };
}
