// ============================================================================
// Kyro CMS — Email Templates Engine Exporter
// ============================================================================

export { renderBaseLayout, type BaseEmailOptions } from "./base.js";
export { renderVerifyEmail } from "./templates/verify-email.js";
export { renderResetPassword } from "./templates/reset-password.js";
export { renderWelcome } from "./templates/welcome.js";
export { renderPasswordChanged } from "./templates/password-changed.js";
export { renderMagicLink } from "./templates/magic-link.js";
export { renderAccountLocked } from "./templates/account-locked.js";
export { renderUserInvite } from "./templates/user-invite.js";

import { renderVerifyEmail } from "./templates/verify-email.js";
import { renderResetPassword } from "./templates/reset-password.js";
import { renderWelcome } from "./templates/welcome.js";
import { renderPasswordChanged } from "./templates/password-changed.js";
import { renderMagicLink } from "./templates/magic-link.js";
import { renderAccountLocked } from "./templates/account-locked.js";
import { renderUserInvite } from "./templates/user-invite.js";

/**
 * Returns complete EmailTemplates registry for EmailTransport
 */
export function getEmailTemplates() {
  return {
    verifyEmail: (link: string, userName?: string) =>
      renderVerifyEmail(link, userName),
    resetPassword: (link: string, userName?: string) =>
      renderResetPassword(link, userName),
    welcome: (userName?: string, appUrl?: string) =>
      renderWelcome(userName, appUrl),
    passwordChanged: (userName?: string) =>
      renderPasswordChanged(userName),
    magicLink: (link: string, code?: string, userName?: string) =>
      renderMagicLink(link, code, userName),
    accountLocked: (attempts: number, durationMinutes: number, userName?: string) =>
      renderAccountLocked(attempts, durationMinutes, userName),
    newLogin: (location: string, time: string, userName = "User") => {
      const subject = "Security Alert: New Sign-in to Kyro CMS";
      const text = `New login detected for ${userName} at ${time} from ${location}.`;
      const html = `<p>${text}</p>`;
      return { subject, html, text };
    },
    userInvite: (inviteUrl: string, roleName?: string, inviterName?: string) =>
      renderUserInvite(inviteUrl, roleName, inviterName),
  };
}
