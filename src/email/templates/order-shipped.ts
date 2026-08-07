// ============================================================================
// E-commerce Order Shipped Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderOrderShipped(
  orderId: string,
  customerName = "Customer",
  trackingNumber: string,
  trackingUrl: string,
  brandConfig?: BrandConfig,
) {
  const subject = `Your Order #${orderId} is on the way!`;
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Great news, <strong class="email-strong" style="color: #09090b;">${customerName}</strong>!
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Your order <strong>#${orderId}</strong> has been shipped and is on its way to you.
    </p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px; padding: 16px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          📦 <strong>Tracking Number:</strong> ${trackingNumber}
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Order Shipped",
    previewText: `Your order #${orderId} has shipped. Track your package now.`,
    bodyHtml,
    ctaText: "Track Package",
    ctaUrl: trackingUrl,
  });

  const text = `Hi ${customerName},\n\nYour order #${orderId} has been shipped!\n\nTracking Number: ${trackingNumber}\nTrack it here: ${trackingUrl}`;

  return { subject, html, text };
}
