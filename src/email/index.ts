import type { BrandConfig } from "./base.js";
// ============================================================================
// Kyro CMS — Email Templates Engine Exporter
// ============================================================================

export { renderBaseLayout, type BaseEmailOptions, type BrandConfig } from "./base.js";
export { renderVerifyEmail } from "./templates/verify-email.js";
export { renderResetPassword } from "./templates/reset-password.js";
export { renderWelcome } from "./templates/welcome.js";
export { renderPasswordChanged } from "./templates/password-changed.js";
export { renderMagicLink } from "./templates/magic-link.js";
export { renderAccountLocked } from "./templates/account-locked.js";
export { renderUserInvite } from "./templates/user-invite.js";
export { renderNewLogin } from "./templates/new-login.js";
export { renderOrderConfirmation } from "./templates/order-confirmation.js";
export { renderOrderShipped } from "./templates/order-shipped.js";
export { renderOrderDelivered } from "./templates/order-delivered.js";
export { renderOrderRefunded } from "./templates/order-refunded.js";
export { renderAbandonedCart } from "./templates/abandoned-cart.js";
import { renderVerifyEmail } from "./templates/verify-email.js";
import { renderResetPassword } from "./templates/reset-password.js";
import { renderWelcome } from "./templates/welcome.js";
import { renderPasswordChanged } from "./templates/password-changed.js";
import { renderMagicLink } from "./templates/magic-link.js";
import { renderAccountLocked } from "./templates/account-locked.js";
import { renderUserInvite } from "./templates/user-invite.js";
import { renderNewLogin } from "./templates/new-login.js";
import { renderOrderConfirmation } from "./templates/order-confirmation.js";
import { renderOrderShipped } from "./templates/order-shipped.js";
import { renderOrderDelivered } from "./templates/order-delivered.js";
import { renderOrderRefunded } from "./templates/order-refunded.js";
import { renderAbandonedCart } from "./templates/abandoned-cart.js";
/**
 * Returns complete EmailTemplates registry for EmailTransport
 */
export function getEmailTemplates(brandConfig?: BrandConfig) {
  return {
    verifyEmail: (link: string, userName?: string) => renderVerifyEmail(link, userName, brandConfig),
    resetPassword: (link: string, userName?: string) => renderResetPassword(link, userName, brandConfig),
    welcome: (userName?: string, appUrl?: string) => renderWelcome(userName, appUrl, brandConfig),
    passwordChanged: (userName?: string) => renderPasswordChanged(userName, brandConfig),
    magicLink: (link: string, code?: string, userName?: string) => renderMagicLink(link, code, userName, brandConfig),
    accountLocked: (attempts: number, durationMinutes: number, userName?: string) =>
      renderAccountLocked(attempts, durationMinutes, userName, brandConfig),
    newLogin: (location: string, time: string, userName?: string) =>
      renderNewLogin(location, time, userName, brandConfig),
    userInvite: (inviteUrl: string, roleName?: string, inviterName?: string) =>
      renderUserInvite(inviteUrl, roleName, inviterName, brandConfig),
    orderConfirmation: (orderId: string, customerName?: string, totalAmount?: string, trackingUrl?: string) =>
      renderOrderConfirmation(orderId, customerName, totalAmount || "0.00", trackingUrl, brandConfig),
    orderShipped: (orderId: string, customerName?: string, trackingNumber?: string, trackingUrl?: string) =>
      renderOrderShipped(orderId, customerName, trackingNumber || "", trackingUrl || "", brandConfig),
    orderDelivered: (orderId: string, customerName?: string, reviewUrl?: string) =>
      renderOrderDelivered(orderId, customerName, reviewUrl || "", brandConfig),
    orderRefunded: (orderId: string, customerName?: string, refundAmount?: string) =>
      renderOrderRefunded(orderId, customerName, refundAmount || "0.00", brandConfig),
    abandonedCart: (customerName?: string, checkoutUrl?: string) =>
      renderAbandonedCart(customerName, checkoutUrl || "", brandConfig),
  };
}
