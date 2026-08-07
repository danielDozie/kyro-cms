// ============================================================================
// E-commerce Abandoned Cart Template
// ============================================================================

import type { BrandConfig } from "../base.js";
import { renderBaseLayout } from "../base.js";

export function renderAbandonedCart(customerName = "Customer", checkoutUrl: string, brandConfig?: BrandConfig) {
  const subject = `You left something behind...`;
  const bodyHtml = `
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hi <strong class="email-strong" style="color: #09090b;">${customerName}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      We noticed you left some great items in your shopping cart. They are still waiting for you, but they might sell out soon!
    </p>
  `;

  const html = renderBaseLayout({
    brand: brandConfig,
    title: "Complete Your Purchase",
    previewText: `Your shopping cart is waiting for you. Complete your purchase now.`,
    bodyHtml,
    ctaText: "Return to Checkout",
    ctaUrl: checkoutUrl,
  });

  const text = `Hi ${customerName},\n\nYou left some items in your cart! Complete your purchase here: ${checkoutUrl}`;

  return { subject, html, text };
}
