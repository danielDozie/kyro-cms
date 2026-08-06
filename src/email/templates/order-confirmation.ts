// ============================================================================
// E-commerce Order Confirmation Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderOrderConfirmation(
  orderId: string,
  customerName = "Customer",
  totalAmount: string,
  trackingUrl?: string,
  brandConfig?: BrandConfig,
) {
  const subject = `Order Confirmation #${orderId}`;
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hi <strong class="email-strong" style="color: #09090b;">${customerName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Thank you for your order! We've received your order <strong>#${orderId}</strong> and are getting it ready for shipment.
    </p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px; padding: 16px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          🛒 <strong>Order Summary:</strong><br/>
          Order Total: <strong>${totalAmount}</strong>
        </td>
      </tr>
    </table>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Order Confirmed",
    previewText: `Your order #${orderId} has been confirmed.`,
    badgeText: "Confirmed",
    badgeType: "success",
    bodyHtml,
    ctaText: "View Order",
    ctaUrl: trackingUrl || "https://kyro-cms.com",
  });

  const text = `Hi ${customerName},\n\nThank you for your order #${orderId}!\n\nOrder Total: ${totalAmount}\n\nView your order here: ${trackingUrl || "https://kyro-cms.com"}`;

  return { subject, html, text };
}
