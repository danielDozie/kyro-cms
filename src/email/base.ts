// ============================================================================
// Kyro CMS — Base Email Layout
// Adaptive Light/Dark Mode HTML Email Template Wrapper
// ============================================================================

export interface BrandConfig {
  siteName?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  appUrl?: string;
}

export interface BaseEmailOptions {
  brand?: BrandConfig;
  title: string;
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
    previewText = title,
    bodyHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
  } = options;

  const siteName = brand?.siteName || "Kyro CMS";
  const logoLight = brand?.logoUrl || "https://kyro-cms.com/logo.svg";
  const logoDark = brand?.logoDarkUrl || brand?.logoUrl || "https://kyro-cms.com/logo-white.svg";
  const appUrl = brand?.appUrl || "https://kyro-cms.com";

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
      .email-body { background-color: #09090b !important; color: #f4f4f5 !important; }
      .email-card { background-color: #121215 !important; border-color: #27272a !important; box-shadow: none !important; }
      .email-header { background-color: #18181b !important; border-color: #27272a !important; }
      .email-brand-text { color: #ffffff !important; }
      .email-title { color: #ffffff !important; }
      .email-text { color: #a1a1aa !important; }
      .email-strong { color: #ffffff !important; }
      .email-table { background-color: #18181b !important; border-color: #27272a !important; }
      .email-td-border { border-color: #27272a !important; }
      .email-label { color: #a1a1aa !important; }
      .email-value { color: #f4f4f5 !important; }
      .email-code-box { background-color: #18181b !important; border-color: #27272a !important; color: #ffffff !important; }
      .email-btn-primary { background-color: #ffffff !important; color: #09090b !important; }
      .email-btn-secondary { background-color: #18181b !important; border-color: #27272a !important; color: #f4f4f5 !important; }
      .email-footer { background-color: #09090b !important; border-color: #27272a !important; }
      .email-footer-text { color: #71717a !important; }
      .email-footer-link { color: #a1a1aa !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 24px 12px; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f4f4f5; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);">
    <!-- Header Bar -->
    <tr>
      <td class="email-header" style="padding: 16px 24px; border-bottom: 1px solid #fafafa; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" valign="middle">
              <a href="${appUrl}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                <!-- Light Mode Logo -->
                <img src="${logoLight}" alt="${siteName} Logo" class="logo-light" height="22" style="display: inline-block; border: 0; max-height: 22px; vertical-align: middle;" />
                <!-- Dark Mode Logo -->
                <img src="${logoDark}" alt="${siteName} Logo" class="logo-dark" height="22" style="display: none; border: 0; max-height: 22px; vertical-align: middle;" />
                <span class="email-brand-text" style="font-size: 15px; font-weight: 600; color: #09090b; letter-spacing: -0.2px; vertical-align: middle;">${siteName}</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Section -->
    <tr>
      <td style="padding: 24px;">
        <h1 class="email-title" style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #09090b; letter-spacing: -0.2px; text-align: center;">
          ${title}
        </h1>
        
        ${bodyHtml}

        ${
          ctaText && ctaUrl
            ? `
        <!-- Action Buttons -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
          <tr>
            <td align="center">
              <a href="${ctaUrl}" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 10px 18px; background-color: #09090b; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 8px;">
                ${ctaText} →
              </a>
              ${
                secondaryCtaText && secondaryCtaUrl
                  ? `<a href="${secondaryCtaUrl}" target="_blank" class="email-btn-secondary" style="display: inline-block; padding: 10px 16px; margin-left: 8px; background-color: #ffffff; border: 1px solid #e4e4e7; color: #09090b; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 8px;">
                ${secondaryCtaText}
              </a>`
                  : ""
              }
            </td>
          </tr>
        </table>`
            : ""
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td class="email-footer" style="padding: 16px 24px; border-top: 1px solid #fafafa; background-color: #fdfdfd; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
          <a href="${appUrl}" target="_blank" class="email-footer-link" style="color: #71717a; text-decoration: none; font-weight: 500;">${appUrl.replace(/^https?:\/\//, "")}</a> &nbsp;•&nbsp; 
          <a href="${appUrl}/docs" target="_blank" class="email-footer-link" style="color: #71717a; text-decoration: none; font-weight: 500;">Docs</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
