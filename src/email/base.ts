// ============================================================================
// Kyro CMS — Base Email Layout
// Adaptive Modern Minimalist Email Template
// ============================================================================

export interface BrandConfig {
  siteName?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  appUrl?: string;
  primaryColor?: string;
  address?: string;
}

export interface BaseEmailOptions {
  brand?: BrandConfig;
  title: string;
  badge?: string;
  previewText?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

export function renderBaseLayout(options: BaseEmailOptions): string {
  const {
    brand,
    title,
    badge,
    previewText = title,
    bodyHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
  } = options;

  const siteName = brand?.siteName || "Lagos Buka";
  const logoLight = brand?.logoUrl || "https://resources.lagosbukasantonio.com/lagosbuka.svg";
  const logoDark = brand?.logoDarkUrl || brand?.logoUrl || logoLight;
  const appUrl = brand?.appUrl || "https://lagosbukasantonio.com";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0c0c0e !important; color: #f4f4f5 !important; }
      .email-card { background-color: #141417 !important; border-color: #27272a !important; }
      .email-header { background-color: #18181b !important; border-color: #27272a !important; }
      .email-brand-text { color: #f4f4f5 !important; }
      .email-title { color: #ffffff !important; }
      .email-text { color: #a1a1aa !important; }
      .email-table { background-color: #18181b !important; border-color: #27272a !important; }
      .email-btn-primary { background-color: #0b3b24 !important; color: #fffdf9 !important; }
      .email-footer { background-color: #0c0c0e !important; border-color: #27272a !important; }
      .email-footer-text { color: #71717a !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 32px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);">
    
    <!-- Brand Logo & Site Name Header -->
    <tr>
      <td style="padding: 28px 32px 20px 32px; text-align: center;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td align="center" valign="middle">
              <a href="${appUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <!-- Brand Logo (preferable before site name) -->
                ${logoLight ? `
                <img src="${logoLight}" alt="${siteName}" class="logo-light" height="34" style="display: block; margin: 0 auto 8px auto; max-height: 34px; border: 0;" />
                <img src="${logoDark}" alt="${siteName}" class="logo-dark" height="34" style="display: none; margin: 0 auto 8px auto; max-height: 34px; border: 0;" />
                ` : ''}
                <span class="email-brand-text" style="font-size: 15px; font-weight: 700; color: #0b3b24; letter-spacing: -0.2px; display: block;">
                  ${siteName}
                </span>
              </a>
            </td>
          </tr>
        </table>

        <!-- Action Header -->
        <div style="margin-top: 16px;">
          ${badge ? `
          <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; margin-bottom: 8px;">
            ${badge}
          </span>
          ` : ''}
          <h1 class="email-title" style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
            ${title}
          </h1>
        </div>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 4px 32px 28px 32px;">
        ${bodyHtml}

        ${ctaText && ctaUrl ? `
        <!-- Action Button -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td align="center">
              <a href="${ctaUrl}" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 12px 24px; background-color: #0b3b24; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 2px 6px rgba(11, 59, 36, 0.15);">
                ${ctaText} &rarr;
              </a>
              ${secondaryCtaText && secondaryCtaUrl ? `
              <a href="${secondaryCtaUrl}" target="_blank" style="display: inline-block; padding: 12px 20px; margin-left: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; color: #334155; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 12px;">
                ${secondaryCtaText}
              </a>
              ` : ''}
            </td>
          </tr>
        </table>
        ` : ''}
      </td>
    </tr>

    <!-- Clean Footer -->
    <tr>
      <td class="email-footer" style="padding: 20px 32px; border-top: 1px solid #f1f5f9; background-color: #fafafa; text-align: center;">
        <p class="email-footer-text" style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          ${brand?.address ? `${brand.address} &middot; ` : ''}
          <a href="${appUrl}" target="_blank" style="color: #0b3b24; text-decoration: none; font-weight: 600;">${siteName}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
