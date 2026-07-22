export interface SeoTagsOptions {
  siteSettings: any;
  seoSettings?: any;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Generates standard SEO meta tags based on global site settings and page overrides.
 */
export function generateSeoTags(options: SeoTagsOptions): string {
  const { siteSettings, seoSettings, title, description, image, url } = options;
  
  if (!siteSettings) return '';

  const siteName = siteSettings.siteName || '';

  // Title resolution: page title → seo defaultTitle → siteName
  const rawTitle = title || seoSettings?.defaultTitle || siteName;
  const titleTemplate = seoSettings?.titleTemplate;
  const separator = seoSettings?.separator || ' | ';
  const siteNameInTitle = seoSettings?.siteNameInTitle !== false;

  const finalTitle = titleTemplate
    ? titleTemplate
        .replace(/\{\{title\}\}/g, rawTitle)
        .replace(/\{\{siteName\}\}/g, siteNameInTitle ? siteName : '')
        .replace(/\{\{separator\}\}/g, separator)
        .replace(/\s+/g, ' ')
        .trim()
    : rawTitle;

  const finalDesc = description || seoSettings?.defaultDescription || siteSettings.siteDescription || '';
  const finalImage = image || (siteSettings.siteOgImage?.url) || '';
  const finalUrl = url || siteSettings.siteUrl || '';

  let tags = `
    <title>${finalTitle}</title>
    <meta name="description" content="${finalDesc}">
  `;

  if (siteSettings.siteFavicon?.url) {
    tags += `\n    <link rel="icon" type="${siteSettings.siteFavicon.mimeType || 'image/x-icon'}" href="${siteSettings.siteFavicon.url}">`;
  }

  // Robots meta
  const robots = seoSettings?.meta?.robots;
  if (robots) {
    tags += `\n    <meta name="robots" content="${robots}">`;
  }

  // Canonical
  const canonical = seoSettings?.meta?.canonicalUrl || finalUrl;
  if (canonical) {
    tags += `\n    <link rel="canonical" href="${canonical}">`;
  }

  // Open Graph
  const ogType = seoSettings?.meta?.ogType || 'website';
  tags += `
    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${finalTitle}">
    <meta property="og:description" content="${finalDesc}">
    <meta property="og:site_name" content="${siteName}">
  `;

  if (finalUrl) tags += `\n    <meta property="og:url" content="${finalUrl}">`;
  if (finalImage) tags += `\n    <meta property="og:image" content="${finalImage}">`;

  // Facebook
  if (seoSettings?.social?.fbAppId) {
    tags += `\n    <meta property="fb:app_id" content="${seoSettings.social.fbAppId}">`;
  }

  // Twitter
  const twitterCard = seoSettings?.social?.twitterCardType || 'summary_large_image';
  tags += `
    <meta name="twitter:card" content="${twitterCard}">
    <meta name="twitter:title" content="${finalTitle}">
    <meta name="twitter:description" content="${finalDesc}">
  `;

  if (seoSettings?.social?.twitterHandle) {
    tags += `\n    <meta name="twitter:site" content="${seoSettings.social.twitterHandle}">`;
  }
  if (finalImage) tags += `\n    <meta name="twitter:image" content="${finalImage}">`;

  // I18n
  if (siteSettings.enableI18n && siteSettings.i18n?.language) {
    tags += `\n    <meta http-equiv="content-language" content="${siteSettings.i18n.language}">`;
  }

  return tags;
}

/**
 * Generates analytics script tags based on global site settings.
 */
export function generateAnalyticsTags(siteSettings: any): string {
  if (!siteSettings || !siteSettings.analyticsEnabled || !siteSettings.analytics) {
    return '';
  }

  const { googleAnalyticsId, googleTagManagerId, plausibleDomain } = siteSettings.analytics;
  let scripts = '';

  if (googleAnalyticsId) {
    scripts += `
      <!-- Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${googleAnalyticsId}');
      </script>
    `;
  }

  if (googleTagManagerId) {
    scripts += `
      <!-- Google Tag Manager -->
      <script>
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${googleTagManagerId}');
      </script>
    `;
  }

  if (plausibleDomain) {
    scripts += `
      <!-- Plausible Analytics -->
      <script defer data-domain="${plausibleDomain}" src="https://plausible.io/js/script.js"></script>
    `;
  }

  return scripts;
}
