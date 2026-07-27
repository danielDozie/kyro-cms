// ============================================================================
// Workspace User Invitation Template
// ============================================================================

import { renderBaseLayout } from "../base.js";

export function renderUserInvite(inviteUrl: string, roleName = "Editor", inviterName = "An Administrator") {
  const subject = "You're invited to join Kyro CMS";
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      <strong class="email-strong" style="color: #09090b;">${inviterName}</strong> has invited you to join their team workspace as an <strong>${roleName}</strong> in Kyro CMS.
    </p>

    <!-- Invite Details Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          <strong>Assigned Role:</strong> ${roleName}<br />
          <strong>Invited By:</strong> ${inviterName}
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    title: "Workspace Invitation",
    previewText: `You have been invited to join Kyro CMS as an ${roleName}.`,
    badgeText: "Team Invite",
    badgeType: "info",
    bodyHtml,
    ctaText: "Accept Invitation",
    ctaUrl: inviteUrl,
    secondaryCtaText: "Documentation",
    secondaryCtaUrl: "https://kyro-cms.com/docs",
  });

  const text = `You're invited to join Kyro CMS as an ${roleName} by ${inviterName}.\n\nAccept your invitation here:\n${inviteUrl}\n\nKyro CMS — https://kyro-cms.com`;

  return { subject, html, text };
}
