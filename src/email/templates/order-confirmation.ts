// ============================================================================
// E-commerce Order Confirmation Template
// Modern Clean Minimalist Design
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
  const subject = `Order confirmed #${orderId}`;
  
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
      Hi ${customerName}, thanks for your order. We're getting your food freshly prepared.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 18px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 12px; color: #64748b; padding-bottom: 6px;">Order number</td>
          <td style="font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; padding-bottom: 6px;">#${orderId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #64748b; padding-bottom: 6px;">Status</td>
          <td style="font-size: 12px; font-weight: 600; color: #047857; text-align: right; padding-bottom: 6px;">Processing in kitchen</td>
        </tr>
        <tr>
          <td style="font-size: 13px; font-weight: 600; color: #0f172a; padding-top: 10px; border-top: 1px solid #e2e8f0;">Total paid</td>
          <td style="font-size: 15px; font-weight: 700; color: #0b3b24; text-align: right; padding-top: 10px; border-top: 1px solid #e2e8f0;">${totalAmount.startsWith('$') ? totalAmount : `$${totalAmount}`}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
      You can track the live preparation and delivery status anytime.
    </p>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Order Confirmed",
    badge: "Order received",
    previewText: `Your order #${orderId} has been confirmed.`,
    bodyHtml,
    ctaText: "Track order live",
    ctaUrl: trackingUrl || "https://lagosbukasantonio.com/track-order",
  });

  const text = `Hi ${customerName},\n\nThank you for your order #${orderId}!\n\nTotal: ${totalAmount}\n\nTrack your order: ${trackingUrl || "https://lagosbukasantonio.com"}`;

  return { subject, html, text };
}
