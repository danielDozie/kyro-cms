// ============================================================================
// Kyro CMS — Base Email Layout
// Adaptive Light/Dark Mode HTML Email Template Wrapper
// ============================================================================

export interface BaseEmailOptions {
  title: string;
  previewText?: string;
  badgeText?: string;
  badgeType?: "success" | "info" | "warning" | "error";
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

export function renderBaseLayout(options: BaseEmailOptions): string {
  const {
    title,
    previewText = title,
    badgeText = "Security Notification",
    badgeType = "info",
    bodyHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
  } = options;

  let badgeBg = "#eff6ff";
  let badgeBorder = "#bfdbfe";
  let badgeColor = "#1d4ed8";

  if (badgeType === "success") {
    badgeBg = "#ecfdf5";
    badgeBorder = "#a7f3d0";
    badgeColor = "#047857";
  } else if (badgeType === "warning") {
    badgeBg = "#fffbeb";
    badgeBorder = "#fde68a";
    badgeColor = "#b45309";
  } else if (badgeType === "error") {
    badgeBg = "#fef2f2";
    badgeBorder = "#fecaca";
    badgeColor = "#b91c1c";
  }

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
<body class="email-body" style="margin: 0; padding: 36px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
    <!-- Header Bar -->
    <tr>
      <td class="email-header" style="padding: 22px 28px; border-bottom: 1px solid #f4f4f5; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="left" valign="middle">
              <a href="https://kyro-cms.com" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px;">
                <!-- Light Mode Logo -->
                <img src="https://kyro-cms.com/logo.svg" alt="Kyro Logo" class="logo-light" height="24" style="display: inline-block; border: 0; max-height: 24px; vertical-align: middle;" />
                <!-- Dark Mode Logo -->
                <img src="https://kyro-cms.com/logo-white.svg" alt="Kyro Logo" class="logo-dark" height="24" style="display: none; border: 0; max-height: 24px; vertical-align: middle;" />
                <span class="email-brand-text" style="font-size: 16px; font-weight: 700; color: #09090b; letter-spacing: -0.3px; vertical-align: middle;">Kyro CMS</span>
              </a>
            </td>
            <td align="right" valign="middle">
              <span class="badge-status" style="display: inline-block; padding: 4px 10px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 9999px; font-size: 11px; font-weight: 500; color: ${badgeColor};">
                ${badgeText}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Section -->
    <tr>
      <td style="padding: 28px;">
        <h1 class="email-title" style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #09090b; letter-spacing: -0.3px;">
          ${title}
        </h1>
        
        ${bodyHtml}

        ${
          ctaText && ctaUrl
            ? `
        <!-- Action Buttons -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td align="left">
              <a href="${ctaUrl}" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 11px 20px; background-color: #09090b; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                ${ctaText} →
              </a>
              ${
                secondaryCtaText && secondaryCtaUrl
                  ? `<a href="${secondaryCtaUrl}" target="_blank" class="email-btn-secondary" style="display: inline-block; padding: 11px 16px; margin-left: 8px; background-color: #ffffff; border: 1px solid #e4e4e7; color: #09090b; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
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
      <td class="email-footer" style="padding: 18px 28px; border-top: 1px solid #f4f4f5; background-color: #fafafa; text-align: center;">
        <p class="email-footer-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
          Sent securely via <strong>Kyro CMS Authentication Engine</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #71717a;">
          <a href="https://kyro-cms.com" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">kyro-cms.com</a> &nbsp;•&nbsp; 
          <a href="https://kyro-cms.com/docs" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">Docs</a> &nbsp;•&nbsp; 
          <a href="https://github.com/danielDozie/kyro-cms" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">GitHub</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
