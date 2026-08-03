import {a}from'./chunk-K6WUOU6P.js';function l(i){let{title:e,previewText:t=e,badgeText:r="Security Notification",badgeType:s="info",bodyHtml:o,ctaText:a,ctaUrl:n,secondaryCtaText:c,secondaryCtaUrl:g}=i,d="#eff6ff",p="#bfdbfe",m="#1d4ed8";return s==="success"?(d="#ecfdf5",p="#a7f3d0",m="#047857"):s==="warning"?(d="#fffbeb",p="#fde68a",m="#b45309"):s==="error"&&(d="#fef2f2",p="#fecaca",m="#b91c1c"),`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${e}</title>
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
  <div style="display: none; max-height: 0; overflow: hidden;">${t}</div>

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
              <span class="badge-status" style="display: inline-block; padding: 4px 10px; background-color: ${d}; border: 1px solid ${p}; border-radius: 9999px; font-size: 11px; font-weight: 500; color: ${m};">
                ${r}
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
          ${e}
        </h1>
        
        ${o}

        ${a&&n?`
        <!-- Action Buttons -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td align="left">
              <a href="${n}" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 11px 20px; background-color: #09090b; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                ${a} \u2192
              </a>
              ${c&&g?`<a href="${g}" target="_blank" class="email-btn-secondary" style="display: inline-block; padding: 11px 16px; margin-left: 8px; background-color: #ffffff; border: 1px solid #e4e4e7; color: #09090b; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                ${c}
              </a>`:""}
            </td>
          </tr>
        </table>`:""}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td class="email-footer" style="padding: 18px 28px; border-top: 1px solid #f4f4f5; background-color: #fafafa; text-align: center;">
        <p class="email-footer-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
          Sent securely via <strong>Kyro CMS Authentication Engine</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #71717a;">
          <a href="https://kyro-cms.com" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">kyro-cms.com</a> &nbsp;\u2022&nbsp; 
          <a href="https://kyro-cms.com/docs" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">Docs</a> &nbsp;\u2022&nbsp; 
          <a href="https://github.com/danielDozie/kyro-cms" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">GitHub</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`}function h(i,e="User"){let t="Confirm your email address \u2014 Kyro CMS",r=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${e}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Thank you for registering. Please confirm your email address by clicking the verification button below to activate your account.
    </p>

    <!-- Verification Token Link Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 12px; color: #71717a; line-height: 1.5; word-break: break-all;">
          <strong>Direct link:</strong><br />
          <a href="${i}" style="color: #09090b; text-decoration: underline;" class="email-value">${i}</a>
        </td>
      </tr>
    </table>

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  `,s=l({title:"Confirm Your Email Address",previewText:"Please confirm your email address to activate your Kyro CMS account.",badgeText:"Action Required",badgeType:"warning",bodyHtml:r,ctaText:"Confirm Email Address",ctaUrl:i,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),o=`Welcome, ${e}!

Please verify your email address by visiting:
${i}

This link expires in 24 hours.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:t,html:s,text:o}}function y(i,e="User"){let t="Reset your password \u2014 Kyro CMS",r=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${e}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      We received a request to reset the password for your account. Click the button below to choose a new password.
    </p>

    <!-- Reset Link Box -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 12px; color: #71717a; line-height: 1.5; word-break: break-all;">
          <strong>Reset URL:</strong><br />
          <a href="${i}" style="color: #09090b; text-decoration: underline;" class="email-value">${i}</a>
        </td>
      </tr>
    </table>

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      For security reasons, this link will expire in 1 hour. If you did not request a password reset, no further action is required.
    </p>
  `,s=l({title:"Reset Your Password",previewText:"Use this secure link to reset your Kyro CMS password.",badgeText:"Security Action",badgeType:"warning",bodyHtml:r,ctaText:"Reset Password",ctaUrl:i}),o=`Hello ${e},

Reset your password using the following link:
${i}

This link will expire in 1 hour.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:t,html:s,text:o}}function b(i="User",e="https://kyro-cms.com"){let t="Welcome to Kyro CMS!",r=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Welcome <strong class="email-strong" style="color: #09090b;">${i}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Your Kyro CMS account is now set up and ready to go. You can access your admin dashboard, build content collections, and manage schema endpoints.
    </p>

    <!-- Key Capabilities List -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px; padding: 16px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          \u{1F680} <strong>What you can do next:</strong>
          <ul style="margin: 8px 0 0; padding-left: 20px; color: #52525b;">
            <li>Define collections & custom field schemas in <code style="font-family: monospace;">kyro.config.ts</code></li>
            <li>Explore auto-generated REST, GraphQL, tRPC & WebSocket endpoints</li>
            <li>Customize your visual Admin dashboard & branding settings</li>
          </ul>
        </td>
      </tr>
    </table>
  `,s=l({title:"Welcome to Kyro CMS",previewText:"Your account is verified and ready. Start building content applications.",badgeText:"Account Ready",badgeType:"success",bodyHtml:r,ctaText:"Open Dashboard",ctaUrl:e,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),o=`Welcome to Kyro CMS, ${i}!

Your account is active. Log in at ${e} to start building.

Documentation: https://kyro-cms.com/docs`;return {subject:t,html:s,text:o}}function x(i="User"){let e="Security Alert: Password Changed \u2014 Kyro CMS",t=new Date().toUTCString(),r=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${i}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      This email confirms that the password for your Kyro CMS account was successfully updated on <strong>${t}</strong>.
    </p>

    <!-- Security Warning Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
          \u26A0\uFE0F <strong>Did not request this change?</strong><br />
          If you did not initiate this change, your account may be compromised. Reset your password immediately and contact an administrator.
        </td>
      </tr>
    </table>
  `,s=l({title:"Password Updated",previewText:"Your Kyro CMS account password was updated.",badgeText:"Security Alert",badgeType:"warning",bodyHtml:r,ctaText:"Account Security",ctaUrl:"https://kyro-cms.com"}),o=`Security Alert: Your Kyro CMS password was updated at ${t}.

If you did not make this change, please reset your password immediately.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:e,html:s,text:o}}function _(i,e,t="User"){let r="Your one-time login link \u2014 Kyro CMS",s=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${t}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Click the button below to sign in to your Kyro CMS account without entering a password.
    </p>

    ${e?`
    <!-- One-Time Passcode Box -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 16px; text-align: center;">
      <tr>
        <td style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          One-Time Passcode
        </td>
      </tr>
      <tr>
        <td style="font-size: 28px; font-weight: 800; font-family: monospace; color: #09090b; letter-spacing: 4px;" class="email-code-box">
          ${e}
        </td>
      </tr>
    </table>`:""}

    <p class="email-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
      This single-use link will expire in 10 minutes. Never share authentication links with anyone.
    </p>
  `,o=l({title:"Sign in to Kyro CMS",previewText:"Your secure magic login link for Kyro CMS.",badgeText:"Instant Login",badgeType:"info",bodyHtml:s,ctaText:"Sign In Now",ctaUrl:i}),a=`Hello ${t},

Sign in to Kyro CMS using the link below:
${i}${e?`

Or enter code: ${e}`:""}

This link expires in 10 minutes.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:r,html:o,text:a}}function S(i,e,t="User"){let r="Security Alert: Account Temporarily Locked \u2014 Kyro CMS",s=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello <strong class="email-strong" style="color: #09090b;">${t}</strong>,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Your Kyro CMS account was temporarily locked after <strong>${i} failed login attempts</strong>.
    </p>

    <!-- Lockout Notice Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #b45309; line-height: 1.5;">
          \u{1F512} <strong>Lockout duration:</strong> ${e} minutes.<br />
          You may try logging in again after the cooling-off period expires.
        </td>
      </tr>
    </table>
  `,o=l({title:"Account Temporarily Locked",previewText:"Your Kyro CMS account was locked due to multiple failed login attempts.",badgeText:"Security Lockout",badgeType:"warning",bodyHtml:s,ctaText:"Unlock Instructions",ctaUrl:"https://kyro-cms.com/docs"}),a=`Security Alert: Account temporarily locked for ${t} after ${i} failed login attempts. Unlocks in ${e} minutes.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:r,html:o,text:a}}function T(i,e="Editor",t="An Administrator"){let r="You're invited to join Kyro CMS",s=`
    <p class="email-text" style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Hello,
    </p>
    <p class="email-text" style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #52525b;">
      <strong class="email-strong" style="color: #09090b;">${t}</strong> has invited you to join their team workspace as an <strong>${e}</strong> in Kyro CMS.
    </p>

    <!-- Invite Details Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 20px; padding: 14px; border-collapse: separate;">
      <tr>
        <td style="font-size: 13px; color: #09090b; line-height: 1.6;" class="email-value">
          <strong>Assigned Role:</strong> ${e}<br />
          <strong>Invited By:</strong> ${t}
        </td>
      </tr>
    </table>
  `,o=l({title:"Workspace Invitation",previewText:`You have been invited to join Kyro CMS as an ${e}.`,badgeText:"Team Invite",badgeType:"info",bodyHtml:s,ctaText:"Accept Invitation",ctaUrl:i,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),a=`You're invited to join Kyro CMS as an ${e} by ${t}.

Accept your invitation here:
${i}

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:r,html:o,text:a}}function w(){return {verifyEmail:(i,e)=>h(i,e),resetPassword:(i,e)=>y(i,e),welcome:(i,e)=>b(i,e),passwordChanged:i=>x(i),magicLink:(i,e,t)=>_(i,e,t),accountLocked:(i,e,t)=>S(i,e,t),newLogin:(i,e,t="User")=>{let r="Security Alert: New Sign-in to Kyro CMS",s=`New login detected for ${t} at ${e} from ${i}.`,o=`<p>${s}</p>`;return {subject:r,html:o,text:s}},userInvite:(i,e,t)=>T(i,e,t)}}var C=false,u=class i{db;cache={};loaded=false;static SENSITIVE_KEYS=["storage.s3.secret_access_key","storage.r2.secret_access_key","storage.gcs.private_key","storage.backblaze.application_key","storage.wasabi.secret_access_key","storage.ftp.password","storage.bunny.api_key","storage.cloudinary.api_secret","storage.imgix.sign_key","email.smtp.pass","auth.jwt_secret","auth.github_secret","auth.google_secret","auth.app_secret","database.url","redis.url","auth.admin_password"];constructor(e){this.db=e;}async load(){if(!this.loaded){await this.ensureSettingsTable();try{if(typeof this.db?.select=="function"){let e=await this.db.select().from(a);this.cache=e.reduce((t,r)=>(t[r.key]=r.value,t),{});}await this.loadFromGlobals();}catch{console.warn("ConfigService: Could not load settings from database, using environment fallbacks.");}this.loaded=true;}}async ensureSettingsTable(){if(!C)try{if(typeof this.db?.execute=="function"){let{sql:e}=await import('drizzle-orm');await this.db.execute(e`
          CREATE TABLE IF NOT EXISTS "settings" (
            "key" VARCHAR(255) PRIMARY KEY,
            "value" TEXT NOT NULL,
            "description" TEXT,
            "updated_at" TIMESTAMP DEFAULT NOW()
          )
        `),C=!0;}else typeof this.db?.exec=="function"&&(this.db.exec(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT
          )
        `),C=!0);}catch{}}async loadFromGlobals(){try{let e=null;if(typeof this.db?.findOne=="function")try{let s=await this.db.findOne({collection:"_globals_storage-settings",where:{},draft:!0});s&&(e=s);}catch{}if(!e&&typeof this.db?.execute=="function"){let{sql:s}=await import('drizzle-orm'),o=['"_globals_storage-settings"','"_globals_storage_settings"','"global_storage_settings"'];for(let a of o)try{let n=await this.db.execute(s`SELECT * FROM ${s.raw(a)} LIMIT 1`);if(e=Array.isArray(n)?n[0]:n?.rows?n.rows[0]:null,e)break}catch{}}else if(!e&&typeof this.db?.prepare=="function"){let s=['"_globals_storage-settings"','"_globals_storage_settings"','"global_storage_settings"'];for(let o of s)try{if(e=this.db.prepare(`SELECT * FROM ${o} LIMIT 1`).get(),e)break}catch{}}if(!e)return;let t=s=>{if(!s)return null;if(typeof s=="string")try{return JSON.parse(s)}catch{return null}return s},r=e.provider||"local";if(this.cache["storage.type"]=r,r==="local"){let s=t(e.local);this.cache["storage.local.dir"]=s?.uploadDir||"./public/uploads",this.cache["storage.local.url"]=s?.baseUrl||"/uploads";}if(r==="aws"){let s=t(e.aws);this.cache["storage.s3.bucket"]=s?.bucket||"",this.cache["storage.s3.region"]=s?.region||"us-east-1",this.cache["storage.s3.access_key_id"]=s?.accessKeyId||"",this.cache["storage.s3.secret_access_key"]=s?.secretAccessKey||"",this.cache["storage.s3.endpoint"]=s?.endpoint||"",this.cache["storage.s3.cdn_url"]=s?.cdnUrl||"",this.cache["storage.s3.prefix"]=s?.prefix||"";}if(r==="r2"){let s=t(e.r2);this.cache["storage.r2.account_id"]=s?.accountId||"",this.cache["storage.r2.access_key_id"]=s?.accessKeyId||"",this.cache["storage.r2.secret_access_key"]=s?.secretAccessKey||"",this.cache["storage.r2.bucket"]=s?.bucket||"",this.cache["storage.r2.cdn_url"]=s?.cdnUrl||"",this.cache["storage.r2.prefix"]=s?.prefix||"";}if(r==="cloudinary"){let s=t(e.cloudinary);this.cache["storage.cloudinary.cloud_name"]=s?.cloudName||"",this.cache["storage.cloudinary.api_key"]=s?.apiKey||"",this.cache["storage.cloudinary.api_secret"]=s?.apiSecret||"",this.cache["storage.cloudinary.folder"]=s?.folder||"";}if(r==="ftp"){let s=t(e.ftp);this.cache["storage.ftp.host"]=s?.host||"",this.cache["storage.ftp.port"]=String(s?.port||"21"),this.cache["storage.ftp.user"]=s?.user||"",this.cache["storage.ftp.password"]=s?.password||"",this.cache["storage.ftp.secure"]=s?.secure?"true":"false",this.cache["storage.ftp.base_url"]=s?.baseUrl||"",this.cache["storage.ftp.prefix"]=s?.prefix||"";}}catch(e){console.warn("ConfigService: Could not load storage settings from globals table:",e);}try{let e=null;if(typeof this.db?.findOne=="function")try{let t=await this.db.findOne({collection:"_globals_email-settings",where:{},draft:!0});t&&(e=t);}catch{}if(!e&&typeof this.db?.execute=="function"){let{sql:t}=await import('drizzle-orm'),r=['"_globals_email-settings"','"_globals_email_settings"','"global_email_settings"'];for(let s of r)try{let o=await this.db.execute(t`SELECT * FROM ${t.raw(s)} LIMIT 1`);if(e=Array.isArray(o)?o[0]:o?.rows?o.rows[0]:null,e)break}catch{}}else if(!e&&typeof this.db?.prepare=="function"){let t=['"_globals_email-settings"','"_globals_email_settings"','"global_email_settings"'];for(let r of t)try{if(e=this.db.prepare(`SELECT * FROM ${r} LIMIT 1`).get(),e)break}catch{}}if(e){let t=r=>{if(!r)return null;if(typeof r=="string")try{return JSON.parse(r)}catch{return null}return r};if(this.cache["email.provider"]=e.provider||"smtp",this.cache["email.smtp.from"]=e.fromEmail||"",this.cache["email.smtp.from_name"]=e.fromName||"",this.cache["email.smtp.reply_to"]=e.replyTo||"",e.provider==="smtp"){let r=t(e.smtp);this.cache["email.smtp.host"]=r?.host||"",this.cache["email.smtp.port"]=String(r?.port||"587"),this.cache["email.smtp.user"]=r?.username||"",this.cache["email.smtp.pass"]=r?.password||"",this.cache["email.smtp.secure"]=r?.secure?"true":"false";}else if(e.provider==="resend"){let r=t(e.resend);this.cache["email.smtp.pass"]=r?.apiKey||"";}else if(e.provider==="sendgrid"){let r=t(e.sendgrid);this.cache["email.smtp.pass"]=r?.apiKey||"";}else if(e.provider==="mailgun"){let r=t(e.mailgun);this.cache["email.smtp.pass"]=r?.apiKey||"";}else if(e.provider==="ses"){let r=t(e.ses);this.cache["email.smtp.user"]=r?.accessKeyId||"",this.cache["email.smtp.pass"]=r?.secretAccessKey||"";}}}catch(e){console.warn("ConfigService: Could not load email settings from globals table:",e);}}get(e,t,r){return this.cache[e]?this.cache[e]:t&&process.env[t]?process.env[t]:r}getStorageConfig(){let e="local";return typeof globalThis.STORAGE_BUCKET<"u"&&(e="cloudflare_r2"),{type:this.get("storage.type","STORAGE_TYPE",e),s3:{bucket:this.get("storage.s3.bucket","STORAGE_BUCKET"),region:this.get("storage.s3.region","STORAGE_REGION","us-east-1"),accessKeyId:this.get("storage.s3.access_key_id","STORAGE_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.s3.secret_access_key","STORAGE_SECRET_ACCESS_KEY"),endpoint:this.get("storage.s3.endpoint","STORAGE_ENDPOINT"),cdnUrl:this.get("storage.s3.cdn_url","STORAGE_CDN_URL"),prefix:this.get("storage.s3.prefix","STORAGE_PREFIX")},r2:{accountId:this.get("storage.r2.account_id","R2_ACCOUNT_ID"),accessKeyId:this.get("storage.r2.access_key_id","R2_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.r2.secret_access_key","R2_SECRET_ACCESS_KEY"),bucket:this.get("storage.r2.bucket","R2_BUCKET"),cdnUrl:this.get("storage.r2.cdn_url","R2_CDN_URL"),prefix:this.get("storage.r2.prefix","R2_PREFIX")},gcs:{bucket:this.get("storage.gcs.bucket","GCS_BUCKET"),projectId:this.get("storage.gcs.project_id","GCS_PROJECT_ID"),clientEmail:this.get("storage.gcs.client_email","GCS_CLIENT_EMAIL"),privateKey:this.get("storage.gcs.private_key","GCS_PRIVATE_KEY"),cdnUrl:this.get("storage.gcs.cdn_url","GCS_CDN_URL"),prefix:this.get("storage.gcs.prefix","GCS_PREFIX")},digitalocean:{bucket:this.get("storage.digitalocean.bucket","DO_BUCKET"),region:this.get("storage.digitalocean.region","DO_REGION","nyc3"),accessKeyId:this.get("storage.digitalocean.access_key_id","DO_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.digitalocean.secret_access_key","DO_SECRET_ACCESS_KEY"),cdnUrl:this.get("storage.digitalocean.cdn_url","DO_CDN_URL"),prefix:this.get("storage.digitalocean.prefix","DO_PREFIX")},backblaze:{bucket:this.get("storage.backblaze.bucket","BB_BUCKET"),accountId:this.get("storage.backblaze.account_id","BB_ACCOUNT_ID"),applicationKeyId:this.get("storage.backblaze.application_key_id","BB_APPLICATION_KEY_ID"),applicationKey:this.get("storage.backblaze.application_key","BB_APPLICATION_KEY"),cdnUrl:this.get("storage.backblaze.cdn_url","BB_CDN_URL"),prefix:this.get("storage.backblaze.prefix","BB_PREFIX")},wasabi:{bucket:this.get("storage.wasabi.bucket","WASABI_BUCKET"),region:this.get("storage.wasabi.region","WASABI_REGION","us-east-1"),accessKeyId:this.get("storage.wasabi.access_key_id","WASABI_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.wasabi.secret_access_key","WASABI_SECRET_ACCESS_KEY"),cdnUrl:this.get("storage.wasabi.cdn_url","WASABI_CDN_URL"),prefix:this.get("storage.wasabi.prefix","WASABI_PREFIX")},bunny:{storageZone:this.get("storage.bunny.storage_zone","BUNNY_STORAGE_ZONE"),apiKey:this.get("storage.bunny.api_key","BUNNY_API_KEY"),cdnUrl:this.get("storage.bunny.cdn_url","BUNNY_CDN_URL"),prefix:this.get("storage.bunny.prefix","BUNNY_PREFIX")},ftp:{host:this.get("storage.ftp.host","FTP_HOST"),port:parseInt(this.get("storage.ftp.port","FTP_PORT","21"),10),user:this.get("storage.ftp.user","FTP_USER"),password:this.get("storage.ftp.password","FTP_PASSWORD"),secure:this.get("storage.ftp.secure","FTP_SECURE")==="true",baseUrl:this.get("storage.ftp.base_url","FTP_BASE_URL"),prefix:this.get("storage.ftp.prefix","FTP_PREFIX")},cloudinary:{cloudName:this.get("storage.cloudinary.cloud_name","CLOUDINARY_CLOUD_NAME"),apiKey:this.get("storage.cloudinary.api_key","CLOUDINARY_API_KEY"),apiSecret:this.get("storage.cloudinary.api_secret","CLOUDINARY_API_SECRET"),folder:this.get("storage.cloudinary.folder","CLOUDINARY_FOLDER")},imgix:{domain:this.get("storage.imgix.domain","IMGIX_DOMAIN"),signKey:this.get("storage.imgix.sign_key","IMGIX_SIGN_KEY")},local:{uploadDir:this.get("storage.local.dir","STORAGE_LOCAL_DIR","./public/uploads"),baseUrl:this.get("storage.local.url","STORAGE_LOCAL_URL","/uploads")}}}getEmailConfig(){return {provider:this.get("email.provider","EMAIL_PROVIDER","smtp"),host:this.get("email.smtp.host","SMTP_HOST"),port:parseInt(this.get("email.smtp.port","SMTP_PORT","587"),10),secure:this.get("email.smtp.secure","SMTP_SECURE")==="true",user:this.get("email.smtp.user","SMTP_USER"),pass:this.get("email.smtp.pass","SMTP_PASS"),from:this.get("email.smtp.from","SMTP_FROM","noreply@example.com"),fromName:this.get("email.smtp.from_name","SMTP_FROM_NAME","Kyro CMS"),replyTo:this.get("email.smtp.reply_to","SMTP_REPLY_TO")}}maskSensitive(e,t){return t&&(i.SENSITIVE_KEYS.includes(e)?"********":t)}async set(e,t,r){await this.db.insert(a).values({key:e,value:t,description:r,updatedAt:new Date}).onConflictDoUpdate({target:[a.key],set:{value:t,description:r,updatedAt:new Date}}),this.cache[e]=t;}};var E=class i{transporter;config;templates;transporterInitialized=false;constructor(e,t){this.config=e,this.templates={...w(),...t};}async ensureTransporter(){if(this.transporterInitialized)return this.transporter;let{default:e}=await import('nodemailer');return this.config.provider==="smtp"&&this.config.smtp?this.transporter=e.createTransport({host:this.config.smtp.host,port:this.config.smtp.port,secure:this.config.smtp.secure,auth:this.config.smtp.auth}):this.config.provider==="ses"&&this.config.ses&&(this.transporter=e.createTransport({host:`email-smtp.${this.config.ses.region}.amazonaws.com`,port:587,secure:false,auth:{user:this.config.ses.accessKeyId,pass:this.config.ses.secretAccessKey}})),this.transporterInitialized=true,this.transporter}async send(e){let{provider:t,from:r,fromName:s,replyTo:o}=this.config,a=`"${s||"Kyro CMS"}" <${r}>`,n=e.replyTo||o;try{let c;switch(t){case "smtp":case "ses":{let g=await this.ensureTransporter();if(!g)throw new Error(`${t} transporter not initialized`);c=await g.sendMail({from:a,to:Array.isArray(e.to)?e.to.join(", "):e.to,subject:e.subject,html:e.html,text:e.text,replyTo:n});}break;case "resend":c=await this.sendViaResend(a,e,n);break;case "sendgrid":c=await this.sendViaSendGrid(a,e,n);break;case "mailgun":c=await this.sendViaMailgun(a,e,n);break;default:throw new Error(`Unsupported email provider: ${t}`)}return c}catch(c){throw console.error("[EmailTransport] FAILED to send email:",c.message),c.response&&console.error("[EmailTransport] Provider Error Detail:",JSON.stringify(c.response,null,2)),c}}async sendViaResend(e,t,r){let s=this.config.resend?.apiKey;if(!s)throw new Error("Resend API Key missing");let o={from:e,to:t.to,subject:t.subject,html:t.html,text:t.text,reply_to:r},a=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify(o)});if(!a.ok){let n=await a.json();throw new Error(`Resend Error: ${JSON.stringify(n)}`)}return a.json()}async sendViaSendGrid(e,t,r){let s=this.config.sendgrid?.apiKey;if(!s)throw new Error("SendGrid API Key missing");let o={personalizations:[{to:Array.isArray(t.to)?t.to.map(n=>({email:n})):[{email:t.to}]}],from:{email:e.match(/<(.+)>/)?.[1]||e,name:e.match(/"(.+)"/)?.[1]},subject:t.subject,content:[{type:"text/plain",value:t.text||""},{type:"text/html",value:t.html}],reply_to:r?{email:r}:void 0},a=await fetch("https://api.sendgrid.com/v3/mail/send",{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify(o)});if(!a.ok){let n=await a.json();throw new Error(`SendGrid Error: ${JSON.stringify(n)}`)}return {success:true}}async sendViaMailgun(e,t,r){let{apiKey:s,domain:o,region:a}=this.config.mailgun||{};if(!s||!o)throw new Error("Mailgun config missing");let n=a==="eu"?"api.eu.mailgun.net":"api.mailgun.net",c=btoa(`api:${s}`),g=new URLSearchParams;g.append("from",e);let d=Array.isArray(t.to)?t.to.join(", "):t.to;g.append("to",d),g.append("subject",t.subject),g.append("html",t.html),t.text&&g.append("text",t.text),r&&g.append("h:Reply-To",r);let p=await fetch(`https://${n}/v3/${o}/messages`,{method:"POST",headers:{Authorization:`Basic ${c}`,"Content-Type":"application/x-www-form-urlencoded"},body:g});if(!p.ok){let m=await p.json();throw new Error(`Mailgun Error: ${JSON.stringify(m)}`)}return p.json()}getTemplates(){return this.templates}async verifyConnection(){if(this.config.provider==="smtp"||this.config.provider==="ses")try{let e=await this.ensureTransporter();if(e)return await e.verify(),!0}catch{return  false}return !!(this.config.resend?.apiKey||this.config.sendgrid?.apiKey||this.config.mailgun?.apiKey)}static async fromConfig(e){let t=new u(e);await t.load();let r=t.getEmailConfig();if(!r.provider)return this.fromEnv();let s={provider:r.provider||"smtp",from:r.from||"noreply@example.com",fromName:r.fromName,replyTo:r.replyTo,smtp:r.provider==="smtp"?{host:r.host||"",port:r.port||587,secure:r.secure||false,auth:{user:r.user||"",pass:r.pass||""}}:void 0,resend:r.provider==="resend"?{apiKey:r.pass||""}:void 0,sendgrid:r.provider==="sendgrid"?{apiKey:r.pass||""}:void 0,mailgun:r.provider==="mailgun"?{apiKey:r.pass||"",domain:r.host||"",region:r.secure?"eu":"us"}:void 0,ses:r.provider==="ses"?{accessKeyId:r.user||"",secretAccessKey:r.pass||"",region:r.host||"us-east-1"}:void 0};return new i(s)}static fromEnv(){let e=process.env.EMAIL_PROVIDER||"smtp",t=process.env.SMTP_FROM||process.env.DEFAULT_FROM||"noreply@example.com",r=process.env.SMTP_FROM_NAME||"Kyro CMS",s=process.env.SMTP_REPLY_TO;if(e==="smtp"){let o=process.env.SMTP_HOST,a=process.env.SMTP_USER,n=process.env.SMTP_PASS;return !o||!a||!n?null:new i({provider:"smtp",from:t,fromName:r,replyTo:s,smtp:{host:o,port:parseInt(process.env.SMTP_PORT||"587",10),secure:process.env.SMTP_SECURE==="true",auth:{user:a,pass:n}}})}if(e==="resend"){let o=process.env.RESEND_API_KEY||process.env.SMTP_PASS;return o?new i({provider:"resend",from:t,fromName:r,replyTo:s,resend:{apiKey:o}}):null}if(e==="sendgrid"){let o=process.env.SENDGRID_API_KEY||process.env.SMTP_PASS;return o?new i({provider:"sendgrid",from:t,fromName:r,replyTo:s,sendgrid:{apiKey:o}}):null}if(e==="mailgun"){let o=process.env.MAILGUN_API_KEY||process.env.SMTP_PASS,a=process.env.MAILGUN_DOMAIN||process.env.SMTP_HOST;return !o||!a?null:new i({provider:"mailgun",from:t,fromName:r,replyTo:s,mailgun:{apiKey:o,domain:a,region:process.env.MAILGUN_REGION||(process.env.SMTP_SECURE==="true"?"eu":"us")}})}if(e==="ses"){let o=process.env.AWS_ACCESS_KEY_ID||process.env.SMTP_USER,a=process.env.AWS_SECRET_ACCESS_KEY||process.env.SMTP_PASS,n=process.env.AWS_REGION||process.env.SMTP_HOST||"us-east-1";return !o||!a?null:new i({provider:"ses",from:t,fromName:r,replyTo:s,ses:{accessKeyId:o,secretAccessKey:a,region:n}})}return null}};var v={minLength:12,requireUppercase:true,requireLowercase:true,requireNumbers:true,requireSpecialChars:true,preventReuse:5,maxLength:128},k=class{config;constructor(e={}){this.config={...v,...e};}validate(e){let t=[];return this.config.maxLength&&e.length>this.config.maxLength&&t.push(`Password must not exceed ${this.config.maxLength} characters`),e.length<this.config.minLength&&t.push(`Password must be at least ${this.config.minLength} characters`),this.config.requireUppercase&&!/[A-Z]/.test(e)&&t.push("Password must contain at least one uppercase letter"),this.config.requireLowercase&&!/[a-z]/.test(e)&&t.push("Password must contain at least one lowercase letter"),this.config.requireNumbers&&!/[0-9]/.test(e)&&t.push("Password must contain at least one number"),this.config.requireSpecialChars&&!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(e)&&t.push("Password must contain at least one special character"),["password","123456","12345678","qwerty","abc123","monkey","1234567","letmein","trustno1","dragon","baseball","iloveyou","master","sunshine","ashley","football","password1","shadow","123123","654321"].includes(e.toLowerCase())&&t.push("This password is too common. Please choose a more secure password"),(/^[a-zA-Z]+$/.test(e)||/^[0-9]+$/.test(e))&&t.push("Password must contain a mix of letters, numbers, and/or special characters"),/(.)\1{2,}/.test(e)&&t.push("Password must not contain more than 2 consecutive identical characters"),/^(012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321|210)+$/i.test(e)&&t.push("Password must not contain sequential numbers or letters"),{valid:t.length===0,errors:t}}async checkReuse(e,t,r){return {valid:true,errors:[]}}async isInHistory(e,t,r){for(let s of t)if(await r(e,s))return  true;return  false}generatePassword(e=16){let t="ABCDEFGHIJKLMNOPQRSTUVWXYZ",r="abcdefghijklmnopqrstuvwxyz",s="0123456789",o="!@#$%^&*()_+-=[]{}|;:,.<>?",a="";a+=t[Math.floor(Math.random()*t.length)],a+=r[Math.floor(Math.random()*r.length)],a+=s[Math.floor(Math.random()*s.length)],a+=o[Math.floor(Math.random()*o.length)];let n=t+r+s+o;for(let c=a.length;c<e;c++)a+=n[Math.floor(Math.random()*n.length)];return a.split("").sort(()=>Math.random()-.5).join("")}getStrength(e){let t=0,r=[];e.length>=8&&(t+=1),e.length>=12&&(t+=1),e.length>=16&&(t+=1),/[a-z]/.test(e)&&(t+=1),/[A-Z]/.test(e)&&(t+=1),/[0-9]/.test(e)&&(t+=1),/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(e)&&(t+=1),e.length>8&&(t+=1),e.length>12&&(t+=1);let s=new Set(e).size;s>6&&(t+=1),s>10&&(t+=1);let o;return t<=3?(o="Weak",r.push("Add more characters"),r.push("Include uppercase and lowercase letters")):t<=5?(o="Fair",r.push("Add special characters"),r.push("Consider making it longer")):t<=7?(o="Good",r.push("Consider making it longer for extra security")):o="Strong",{score:t,label:o,feedback:r}}setConfig(e){this.config={...this.config,...e};}getConfig(){return {...this.config}}};
export{l as a,h as b,y as c,b as d,x as e,_ as f,S as g,T as h,w as i,u as j,E as k,k as l};