// ============================================================================
// E-commerce Order Delivered Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderOrderDelivered(
  orderId: string,
  customerName = "Customer",
  reviewUrl: string,
  brandConfig?: BrandConfig,
) {
  const subject = `Your Order #${orderId} has been delivered`;
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hi <strong class="email-strong" style="color: #09090b;">${customerName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Good news! Your order <strong>#${orderId}</strong> has been successfully delivered. We hope you love it!
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      We'd love to hear your thoughts. If you have a minute, please leave a review for your items.
    </p>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Order Delivered",
    previewText: `Your order #${orderId} has arrived!`,
    badgeText: "Delivered",
    badgeType: "success",
    bodyHtml,
    ctaText: "Leave a Review",
    ctaUrl: reviewUrl,
  });

  const text = `Hi ${customerName},\n\nYour order #${orderId} has been delivered!\n\nLeave a review here: ${reviewUrl}`;

  return { subject, html, text };
}
