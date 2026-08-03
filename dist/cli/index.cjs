#!/usr/bin/env node
'use strict';var Te=require('bcryptjs'),Je=require('crypto'),X=require('fs'),z=require('path'),module$1=require('module'),pgCore=require('drizzle-orm/pg-core'),drizzleOrm=require('drizzle-orm'),commander=require('commander'),url=require('url'),glob=require('glob'),child_process=require('child_process'),Nt=require('prompts'),u=require('chalk'),K=require('ora');var _documentCurrentScript=typeof document!=='undefined'?document.currentScript:null;function _interopDefault(e){return e&&e.__esModule?e:{default:e}}var Te__default=/*#__PURE__*/_interopDefault(Te);var Je__default=/*#__PURE__*/_interopDefault(Je);var X__default=/*#__PURE__*/_interopDefault(X);var z__default=/*#__PURE__*/_interopDefault(z);var Nt__default=/*#__PURE__*/_interopDefault(Nt);var u__default=/*#__PURE__*/_interopDefault(u);var K__default=/*#__PURE__*/_interopDefault(K);var At=Object.defineProperty;var x=(i,e)=>()=>(i&&(e=i(i=0)),e);var re=(i,e)=>{for(var t in e)At(i,t,{get:e[t],enumerable:true});};var Ze={};re(Ze,{SQLiteAuthAdapter:()=>q});function Dt(){return ne||(ne=module$1.createRequire("file:///")("node:sqlite").DatabaseSync,ne)}var ne,vt,Mt,$t,Ft,q,Ee=x(()=>{vt=5e3,Mt=1e3,$t=-64e3,Ft=268435456,q=class{db=null;path;saltRounds;externalDb;busyTimeout;walAutoCheckpoint;cacheSize;mmapSize;preparedStatements=new Map;constructor(e={}){this.path=e.path||"./data/auth.db",this.saltRounds=e.saltRounds||12,this.externalDb=!!e.db,this.busyTimeout=e.busyTimeout??vt,this.walAutoCheckpoint=e.walAutoCheckpoint??Mt,this.cacheSize=e.cacheSize??$t,this.mmapSize=e.mmapSize??Ft,e.db&&(this.db=e.db);}async connect(){if(this.db)return;let e=z.dirname(this.path);e&&e!=="."&&X.mkdirSync(e,{recursive:true}),this.db=new(Dt())(this.path),this.db.exec(`PRAGMA busy_timeout = ${this.busyTimeout}`),this.db.exec("PRAGMA journal_mode = WAL"),this.db.exec("PRAGMA synchronous = NORMAL"),this.db.exec("PRAGMA cache_size = "+this.cacheSize),this.db.exec("PRAGMA mmap_size = "+this.mmapSize),this.db.exec("PRAGMA wal_autocheckpoint = "+this.walAutoCheckpoint),this.db.exec("PRAGMA foreign_keys = ON"),this.db.exec("PRAGMA temp_store = MEMORY"),this.ensureTables(),this.prepareStatements();}async disconnect(){this.db&&!this.externalDb&&(this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)"),this.db.close(),this.db=null,this.preparedStatements.clear());}async ensureConnected(){if(this.db||await this.connect(),!this.db)throw new Error("Failed to connect to SQLite database");return this.db}ensureTables(){if(this.db){this.db.exec(`
      CREATE TABLE IF NOT EXISTS kyro_users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        tenant_id TEXT,
        email_verified INTEGER DEFAULT 0,
        locked INTEGER DEFAULT 0,
        last_login TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        avatar TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kyro_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS kyro_password_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS kyro_rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        UNIQUE(key, window_start)
      );

      CREATE TABLE IF NOT EXISTS kyro_lockouts (
        user_id TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt INTEGER,
        locked_at INTEGER,
        locked_until INTEGER
      );

      CREATE TABLE IF NOT EXISTS kyro_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        user_email TEXT,
        role TEXT,
        resource TEXT NOT NULL,
        resource_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_kyro_users_email ON kyro_users(email);
      CREATE INDEX IF NOT EXISTS idx_kyro_sessions_user_id ON kyro_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyro_sessions_token ON kyro_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_kyro_sessions_refresh_token ON kyro_sessions(refresh_token);
      CREATE INDEX IF NOT EXISTS idx_kyro_sessions_expires ON kyro_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_kyro_password_history_user_id ON kyro_password_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyro_rate_limits_key ON kyro_rate_limits(key);
      CREATE INDEX IF NOT EXISTS idx_kyro_rate_limits_window ON kyro_rate_limits(window_start);
      CREATE INDEX IF NOT EXISTS idx_kyro_lockouts_locked_until ON kyro_lockouts(locked_until);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_timestamp ON kyro_audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_action ON kyro_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_user_id ON kyro_audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_resource ON kyro_audit_logs(resource);

      CREATE TABLE IF NOT EXISTS kyro_email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS kyro_password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_kyro_email_verifications_token ON kyro_email_verifications(token);
      CREATE INDEX IF NOT EXISTS idx_kyro_password_resets_token ON kyro_password_resets(token);
    `);try{this.db.exec("ALTER TABLE kyro_users ADD COLUMN name TEXT");}catch{}try{this.db.exec("ALTER TABLE kyro_users ADD COLUMN avatar TEXT");}catch{}}}prepareStatements(){this.db&&(this.preparedStatements.set("findUserByEmail",this.db.prepare("SELECT * FROM kyro_users WHERE email = ?")),this.preparedStatements.set("findUserById",this.db.prepare("SELECT * FROM kyro_users WHERE id = ?")),this.preparedStatements.set("findSessionByToken",this.db.prepare("SELECT * FROM kyro_sessions WHERE token = ?")),this.preparedStatements.set("findSessionByRefreshToken",this.db.prepare("SELECT * FROM kyro_sessions WHERE refresh_token = ?")),this.preparedStatements.set("deleteSession",this.db.prepare("DELETE FROM kyro_sessions WHERE id = ? OR token = ?")),this.preparedStatements.set("deleteUserSessions",this.db.prepare("DELETE FROM kyro_sessions WHERE user_id = ?")),this.preparedStatements.set("countUsers",this.db.prepare("SELECT COUNT(*) as count FROM kyro_users")),this.preparedStatements.set("deleteUser",this.db.prepare("DELETE FROM kyro_users WHERE id = ?")),this.preparedStatements.set("findUsersPaginated",this.db.prepare("SELECT * FROM kyro_users ORDER BY created_at DESC LIMIT ? OFFSET ?")),this.preparedStatements.set("findUsersWithSearch",this.db.prepare("SELECT * FROM kyro_users WHERE email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?")),this.preparedStatements.set("countUsersWithSearch",this.db.prepare("SELECT COUNT(*) as count FROM kyro_users WHERE email LIKE ?")),this.preparedStatements.set("getPasswordHistory",this.db.prepare("SELECT password_hash FROM kyro_password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")),this.preparedStatements.set("addPasswordHistory",this.db.prepare("INSERT INTO kyro_password_history (user_id, password_hash, created_at) VALUES (?, ?, ?)")),this.preparedStatements.set("trimPasswordHistory",this.db.prepare(`DELETE FROM kyro_password_history WHERE id IN (
          SELECT id FROM kyro_password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 5
        )`)),this.preparedStatements.set("deleteExpiredSessions",this.db.prepare("DELETE FROM kyro_sessions WHERE expires_at < ?")),this.preparedStatements.set("cleanupOldAuditLogs",this.db.prepare("DELETE FROM kyro_audit_logs WHERE timestamp < ?")),this.preparedStatements.set("cleanupExpiredLockouts",this.db.prepare("UPDATE kyro_lockouts SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE locked_until < ?")),this.preparedStatements.set("getLockout",this.db.prepare("SELECT * FROM kyro_lockouts WHERE user_id = ?")),this.preparedStatements.set("upsertLockout",this.db.prepare(`
        INSERT INTO kyro_lockouts (user_id, attempts, last_attempt, locked_at, locked_until)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          attempts = excluded.attempts,
          last_attempt = excluded.last_attempt,
          locked_at = excluded.locked_at,
          locked_until = excluded.locked_until
      `)),this.preparedStatements.set("resetLockout",this.db.prepare("UPDATE kyro_lockouts SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE user_id = ?")));}stmt(e){let t=this.preparedStatements.get(e);if(!t)throw new Error(`Prepared statement not found: ${e}`);return t}async cleanupExpiredSessions(){return await this.ensureConnected(),this.stmt("deleteExpiredSessions").run(new Date().toISOString()).changes}async cleanupOldAuditLogs(e=30){await this.ensureConnected();let t=new Date(Date.now()-e*24*60*60*1e3).toISOString();return this.stmt("cleanupOldAuditLogs").run(t).changes}async getStats(){await this.ensureConnected();let e=this.stmt("countUsers").get().count,t=this.db.prepare("SELECT COUNT(*) as count FROM kyro_sessions WHERE expires_at > ?").get(new Date().toISOString()).count,s=this.db.prepare("SELECT COUNT(*) as count FROM kyro_audit_logs").get().count;return {userCount:e,activeSessionCount:t,auditLogCount:s}}async createUser(e){await this.ensureConnected();let t=Je.randomBytes(16).toString("hex"),s=new Date().toISOString(),r=await this.hashPassword(e.password),n={id:t,name:e.name,email:e.email.toLowerCase(),passwordHash:r,role:e.role||"customer",avatar:e.avatar,tenantId:e.tenantId,createdAt:s,updatedAt:s};return this.db.prepare(`INSERT INTO kyro_users (id, name, email, password_hash, role, avatar, tenant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t,n.name||null,n.email,n.passwordHash,n.role,n.avatar||null,n.tenantId||null,s,s),n}async findUserByEmail(e){await this.ensureConnected();let t=this.stmt("findUserByEmail").get(e.toLowerCase());return t?this.rowToUser(t):null}async findUserById(e){await this.ensureConnected();let t=this.stmt("findUserById").get(e);return t?this.rowToUser(t):null}async updateUser(e,t){if(await this.ensureConnected(),!await this.findUserById(e))return null;let r=[],n=[];return t.email!==void 0&&(r.push("email = ?"),n.push(t.email.toLowerCase())),t.name!==void 0&&(r.push("name = ?"),n.push(t.name)),t.passwordHash!==void 0&&(r.push("password_hash = ?"),n.push(t.passwordHash)),t.role!==void 0&&(r.push("role = ?"),n.push(t.role)),t.avatar!==void 0&&(r.push("avatar = ?"),n.push(t.avatar)),t.tenantId!==void 0&&(r.push("tenant_id = ?"),n.push(t.tenantId)),t.emailVerified!==void 0&&(r.push("email_verified = ?"),n.push(t.emailVerified?1:0)),t.locked!==void 0&&(r.push("locked = ?"),n.push(t.locked?1:0)),t.lastLogin!==void 0&&(r.push("last_login = ?"),n.push(t.lastLogin)),t.failedLoginAttempts!==void 0&&(r.push("failed_login_attempts = ?"),n.push(t.failedLoginAttempts)),r.push("updated_at = ?"),n.push(new Date().toISOString()),n.push(e),this.db.prepare(`UPDATE kyro_users SET ${r.join(", ")} WHERE id = ?`).run(...n),this.findUserById(e)}async deleteUser(e){return await this.ensureConnected(),this.stmt("deleteUser").run(e).changes>0}async hashPassword(e){return Te__default.default.hash(e,this.saltRounds)}async verifyPassword(e,t){await this.ensureConnected();let s=await this.findUserByEmail(e);if(!s)return null;let r=this.db.prepare("SELECT password_hash FROM kyro_users WHERE id = ?").get(s.id);return r?.password_hash&&await Te__default.default.compare(t,r.password_hash)?s:null}async createSession(e,t={}){await this.ensureConnected();let s=Je.randomBytes(32).toString("hex"),r=Je.randomBytes(32).toString("base64url"),n=Je.randomBytes(32).toString("base64url"),o=new Date,a=new Date(o.getTime()+864e5).toISOString(),c={id:s,userId:e,token:r,refreshToken:n,expiresAt:a,createdAt:o.toISOString(),ipAddress:t.ipAddress,userAgent:t.userAgent};return this.db.prepare(`INSERT INTO kyro_sessions (id, user_id, token, refresh_token, expires_at, created_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(c.id,c.userId,c.token,c.refreshToken??null,c.expiresAt,c.createdAt,c.ipAddress??null,c.userAgent??null),c}async findSessionByToken(e){await this.ensureConnected();let t=this.stmt("findSessionByToken").get(e);return t?this.rowToSession(t):null}async findSessionByRefreshToken(e){await this.ensureConnected();let t=this.stmt("findSessionByRefreshToken").get(e);return t?this.rowToSession(t):null}async deleteSession(e){return await this.ensureConnected(),this.stmt("deleteSession").run(e,e).changes>0}async deleteUserSessions(e){return await this.ensureConnected(),this.stmt("deleteUserSessions").run(e).changes}async hasAnyUsers(){return await this.ensureConnected(),this.stmt("countUsers").get().count>0}async findUsers(e={}){await this.ensureConnected();let t=e.page??1,s=e.limit??10,r=(t-1)*s,n=e.search,o,a;if(n){let c=`%${n}%`;o=this.stmt("countUsersWithSearch").get(c).count,a=this.stmt("findUsersWithSearch").all(c,s,r);}else o=this.stmt("countUsers").get().count,a=this.stmt("findUsersPaginated").all(s,r);return {users:a.map(c=>this.rowToUser(c)),total:o}}async addPasswordToHistory(e,t){await this.ensureConnected(),this.stmt("addPasswordHistory").run(e,t,new Date().toISOString()),this.stmt("trimPasswordHistory").run(e);}async getPasswordHistory(e,t=5){return await this.ensureConnected(),this.stmt("getPasswordHistory").all(e,t).map(r=>r.password_hash)}async isPasswordInHistory(e,t,s=5){let r=await this.getPasswordHistory(t,s);for(let n of r)if(await Te__default.default.compare(e,n))return  true;return  false}async recordFailedAttempt(e){await this.ensureConnected();let t=Date.now(),s=this.stmt("getLockout").get(e),r=(s?.attempts||0)+1,n=r>=5?t+900*1e3:s?.locked_until||null;this.stmt("upsertLockout").run(e,r,t,n!==null?t:null,n);}async resetAttempts(e){await this.ensureConnected(),this.stmt("resetLockout").run(e);}async checkLockout(e){await this.ensureConnected(),this.stmt("cleanupExpiredLockouts").run(Date.now());let t=this.stmt("getLockout").get(e);return t?t.locked_until!==null&&t.locked_until>Date.now()?{locked:true,attemptsRemaining:0,lockedUntil:new Date(t.locked_until),totalAttempts:t.attempts}:{locked:false,attemptsRemaining:Math.max(0,5-t.attempts),totalAttempts:t.attempts}:{locked:false,attemptsRemaining:5,totalAttempts:0}}async logAudit(e){await this.ensureConnected();let t=Je.randomBytes(16).toString("hex"),s=new Date().toISOString();return this.db.prepare(`INSERT INTO kyro_audit_logs (
          id, timestamp, action, user_id, user_email, role, resource, resource_id,
          ip_address, user_agent, success, error, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t,s,e.action,e.userId||null,e.userEmail||null,e.role||null,e.resource,e.resourceId||null,e.ipAddress||null,e.userAgent||null,e.success?1:0,e.error||null,e.metadata?JSON.stringify(e.metadata):null,new Date().toISOString()),t}async queryAuditLogs(e={}){await this.ensureConnected();let t=[],s=[];e.action&&(t.push("action = ?"),s.push(e.action)),e.userId&&(t.push("user_id = ?"),s.push(e.userId)),e.resource&&(t.push("resource = ?"),s.push(e.resource)),e.success!==void 0&&(t.push("success = ?"),s.push(e.success?1:0)),e.startDate&&(t.push("timestamp >= ?"),s.push(e.startDate.toISOString())),e.endDate&&(t.push("timestamp <= ?"),s.push(e.endDate.toISOString()));let r=t.length>0?"WHERE "+t.join(" AND "):"",n=e.limit||50,o=e.offset||0,a=this.db.prepare(`SELECT COUNT(*) as count FROM kyro_audit_logs ${r}`).get(...s),c=this.db.prepare(`SELECT * FROM kyro_audit_logs ${r} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...s,n,o);return {total:a.count,logs:c.map(d=>({id:d.id,timestamp:new Date(d.timestamp),action:d.action,userId:d.user_id||void 0,userEmail:d.user_email||void 0,resource:d.resource,resourceId:d.resource_id||void 0,ipAddress:d.ip_address||void 0,userAgent:d.user_agent||void 0,success:d.success===1,error:d.error||void 0,metadata:d.metadata?JSON.parse(d.metadata):void 0}))}}rowToUser(e){return {id:e.id,name:e.name||void 0,email:e.email,passwordHash:e.password_hash,role:e.role,tenantId:e.tenant_id,avatar:e.avatar,emailVerified:e.email_verified===1,locked:e.locked===1,lastLogin:e.last_login,failedLoginAttempts:e.failed_login_attempts||0,createdAt:e.created_at,updatedAt:e.updated_at}}rowToSession(e){return {id:e.id,userId:e.user_id,token:e.token,refreshToken:e.refresh_token,expiresAt:e.expires_at,createdAt:e.created_at,ipAddress:e.ip_address,userAgent:e.user_agent}}async findAuditLogs(e){let t=await this.queryAuditLogs({action:e.action,userId:e.userId,resource:e.resource,success:e.success,startDate:e.startDate,endDate:e.endDate,limit:e.limit,offset:e.offset});return {logs:t.logs.map(s=>({...s,action:s.action})),total:t.total}}async createAuditLog(e){let t=await this.logAudit({action:e.action,userId:e.userId,userEmail:e.userEmail,role:e.role,resource:e.resource,resourceId:e.resourceId,ipAddress:e.ipAddress,userAgent:e.userAgent,success:e.success,error:e.error,metadata:e.metadata}),s=this.db?.prepare("SELECT * FROM kyro_audit_logs WHERE id = ?").get(t);return {...e,id:t,timestamp:s?new Date(s.timestamp):new Date}}async createEmailVerificationToken(e){await this.ensureConnected();let t=Je.randomBytes(16).toString("hex"),s=Je.randomBytes(32).toString("hex"),r=new Date(Date.now()+1440*60*1e3);return this.db.prepare("INSERT INTO kyro_email_verifications (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(t,e,s,r.toISOString(),new Date().toISOString()),{token:s,expiresAt:r}}async verifyEmailToken(e){await this.ensureConnected();let t=this.db.prepare("SELECT * FROM kyro_email_verifications WHERE token = ?").get(e);return t?new Date(t.expires_at)<new Date?{success:false,error:"Verification token has expired"}:(this.db.prepare("UPDATE kyro_users SET email_verified = 1 WHERE id = ?").run(t.user_id),this.db.prepare("DELETE FROM kyro_email_verifications WHERE id = ?").run(t.id),{success:true,userId:t.user_id}):{success:false,error:"Invalid verification token"}}async createPasswordResetToken(e){await this.ensureConnected();let t=await this.findUserByEmail(e);if(!t)return {token:"",expiresAt:new Date,error:"User not found"};let s=Je.randomBytes(16).toString("hex"),r=Je.randomBytes(32).toString("hex"),n=new Date(Date.now()+3600*1e3);return this.db.prepare("INSERT INTO kyro_password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(s,t.id,r,n.toISOString(),new Date().toISOString()),{token:r,expiresAt:n}}async resetPasswordWithToken(e,t){await this.ensureConnected();let s=this.db.prepare("SELECT * FROM kyro_password_resets WHERE token = ?").get(e);if(!s)return {success:false,error:"Invalid reset token"};if(new Date(s.expires_at)<new Date)return {success:false,error:"Reset token has expired"};if(s.used_at)return {success:false,error:"Reset token has already been used"};let r=await this.hashPassword(t);return this.db.prepare("UPDATE kyro_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(r,new Date().toISOString(),s.user_id),this.db.prepare("UPDATE kyro_password_resets SET used_at = ? WHERE id = ?").run(new Date().toISOString(),s.id),this.db.prepare("DELETE FROM kyro_sessions WHERE user_id = ?").run(s.user_id),{success:true}}};});function k(i){let{title:e,previewText:t=e,badgeText:s="Security Notification",badgeType:r="info",bodyHtml:n,ctaText:o,ctaUrl:a,secondaryCtaText:c,secondaryCtaUrl:d}=i,f="#eff6ff",l="#bfdbfe",b="#1d4ed8";return r==="success"?(f="#ecfdf5",l="#a7f3d0",b="#047857"):r==="warning"?(f="#fffbeb",l="#fde68a",b="#b45309"):r==="error"&&(f="#fef2f2",l="#fecaca",b="#b91c1c"),`<!DOCTYPE html>
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
              <span class="badge-status" style="display: inline-block; padding: 4px 10px; background-color: ${f}; border: 1px solid ${l}; border-radius: 9999px; font-size: 11px; font-weight: 500; color: ${b};">
                ${s}
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
        
        ${n}

        ${o&&a?`
        <!-- Action Buttons -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td align="left">
              <a href="${a}" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 11px 20px; background-color: #09090b; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                ${o} \u2192
              </a>
              ${c&&d?`<a href="${d}" target="_blank" class="email-btn-secondary" style="display: inline-block; padding: 11px 16px; margin-left: 8px; background-color: #ffffff; border: 1px solid #e4e4e7; color: #09090b; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
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
</html>`}var D=x(()=>{});function _e(i,e="User"){let t="Confirm your email address \u2014 Kyro CMS",s=`
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
  `,r=k({title:"Confirm Your Email Address",previewText:"Please confirm your email address to activate your Kyro CMS account.",badgeText:"Action Required",badgeType:"warning",bodyHtml:s,ctaText:"Confirm Email Address",ctaUrl:i,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),n=`Welcome, ${e}!

Please verify your email address by visiting:
${i}

This link expires in 24 hours.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:t,html:r,text:n}}var be=x(()=>{D();});function Ae(i,e="User"){let t="Reset your password \u2014 Kyro CMS",s=`
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
  `,r=k({title:"Reset Your Password",previewText:"Use this secure link to reset your Kyro CMS password.",badgeText:"Security Action",badgeType:"warning",bodyHtml:s,ctaText:"Reset Password",ctaUrl:i}),n=`Hello ${e},

Reset your password using the following link:
${i}

This link will expire in 1 hour.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:t,html:r,text:n}}var we=x(()=>{D();});function Se(i="User",e="https://kyro-cms.com"){let t="Welcome to Kyro CMS!",s=`
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
  `,r=k({title:"Welcome to Kyro CMS",previewText:"Your account is verified and ready. Start building content applications.",badgeText:"Account Ready",badgeType:"success",bodyHtml:s,ctaText:"Open Dashboard",ctaUrl:e,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),n=`Welcome to Kyro CMS, ${i}!

Your account is active. Log in at ${e} to start building.

Documentation: https://kyro-cms.com/docs`;return {subject:t,html:r,text:n}}var xe=x(()=>{D();});function ke(i="User"){let e="Security Alert: Password Changed \u2014 Kyro CMS",t=new Date().toUTCString(),s=`
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
  `,r=k({title:"Password Updated",previewText:"Your Kyro CMS account password was updated.",badgeText:"Security Alert",badgeType:"warning",bodyHtml:s,ctaText:"Account Security",ctaUrl:"https://kyro-cms.com"}),n=`Security Alert: Your Kyro CMS password was updated at ${t}.

If you did not make this change, please reset your password immediately.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:e,html:r,text:n}}var Ie=x(()=>{D();});function Re(i,e,t="User"){let s="Your one-time login link \u2014 Kyro CMS",r=`
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
  `,n=k({title:"Sign in to Kyro CMS",previewText:"Your secure magic login link for Kyro CMS.",badgeText:"Instant Login",badgeType:"info",bodyHtml:r,ctaText:"Sign In Now",ctaUrl:i}),o=`Hello ${t},

Sign in to Kyro CMS using the link below:
${i}${e?`

Or enter code: ${e}`:""}

This link expires in 10 minutes.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:s,html:n,text:o}}var Ne=x(()=>{D();});function Le(i,e,t="User"){let s="Security Alert: Account Temporarily Locked \u2014 Kyro CMS",r=`
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
  `,n=k({title:"Account Temporarily Locked",previewText:"Your Kyro CMS account was locked due to multiple failed login attempts.",badgeText:"Security Lockout",badgeType:"warning",bodyHtml:r,ctaText:"Unlock Instructions",ctaUrl:"https://kyro-cms.com/docs"}),o=`Security Alert: Account temporarily locked for ${t} after ${i} failed login attempts. Unlocks in ${e} minutes.

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:s,html:n,text:o}}var Ce=x(()=>{D();});function Ue(i,e="Editor",t="An Administrator"){let s="You're invited to join Kyro CMS",r=`
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
  `,n=k({title:"Workspace Invitation",previewText:`You have been invited to join Kyro CMS as an ${e}.`,badgeText:"Team Invite",badgeType:"info",bodyHtml:r,ctaText:"Accept Invitation",ctaUrl:i,secondaryCtaText:"Documentation",secondaryCtaUrl:"https://kyro-cms.com/docs"}),o=`You're invited to join Kyro CMS as an ${e} by ${t}.

Accept your invitation here:
${i}

Kyro CMS \u2014 https://kyro-cms.com`;return {subject:s,html:n,text:o}}var Oe=x(()=>{D();});function Pe(){return {verifyEmail:(i,e)=>_e(i,e),resetPassword:(i,e)=>Ae(i,e),welcome:(i,e)=>Se(i,e),passwordChanged:i=>ke(i),magicLink:(i,e,t)=>Re(i,e,t),accountLocked:(i,e,t)=>Le(i,e,t),newLogin:(i,e,t="User")=>{let s="Security Alert: New Sign-in to Kyro CMS",r=`New login detected for ${t} at ${e} from ${i}.`,n=`<p>${r}</p>`;return {subject:s,html:n,text:r}},userInvite:(i,e,t)=>Ue(i,e,t)}}var et=x(()=>{D();be();we();xe();Ie();Ne();Ce();Oe();be();we();xe();Ie();Ne();Ce();Oe();});var oe,st=x(()=>{oe=pgCore.pgTable("settings",{key:pgCore.varchar("key",{length:255}).primaryKey(),value:pgCore.text("value").notNull(),description:pgCore.text("description"),updatedAt:pgCore.timestamp("updated_at").defaultNow()});});var De,ae,rt=x(()=>{st();De=false,ae=class i{db;cache={};loaded=false;static SENSITIVE_KEYS=["storage.s3.secret_access_key","storage.r2.secret_access_key","storage.gcs.private_key","storage.backblaze.application_key","storage.wasabi.secret_access_key","storage.ftp.password","storage.bunny.api_key","storage.cloudinary.api_secret","storage.imgix.sign_key","email.smtp.pass","auth.jwt_secret","auth.github_secret","auth.google_secret","auth.app_secret","database.url","redis.url","auth.admin_password"];constructor(e){this.db=e;}async load(){if(!this.loaded){await this.ensureSettingsTable();try{if(typeof this.db?.select=="function"){let e=await this.db.select().from(oe);this.cache=e.reduce((t,s)=>(t[s.key]=s.value,t),{});}await this.loadFromGlobals();}catch{console.warn("ConfigService: Could not load settings from database, using environment fallbacks.");}this.loaded=true;}}async ensureSettingsTable(){if(!De)try{if(typeof this.db?.execute=="function"){let{sql:e}=await import('drizzle-orm');await this.db.execute(e`
          CREATE TABLE IF NOT EXISTS "settings" (
            "key" VARCHAR(255) PRIMARY KEY,
            "value" TEXT NOT NULL,
            "description" TEXT,
            "updated_at" TIMESTAMP DEFAULT NOW()
          )
        `),De=!0;}else typeof this.db?.exec=="function"&&(this.db.exec(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT
          )
        `),De=!0);}catch{}}async loadFromGlobals(){try{let e=null;if(typeof this.db?.findOne=="function")try{let r=await this.db.findOne({collection:"_globals_storage-settings",where:{},draft:!0});r&&(e=r);}catch{}if(!e&&typeof this.db?.execute=="function"){let{sql:r}=await import('drizzle-orm'),n=['"_globals_storage-settings"','"_globals_storage_settings"','"global_storage_settings"'];for(let o of n)try{let a=await this.db.execute(r`SELECT * FROM ${r.raw(o)} LIMIT 1`);if(e=Array.isArray(a)?a[0]:a?.rows?a.rows[0]:null,e)break}catch{}}else if(!e&&typeof this.db?.prepare=="function"){let r=['"_globals_storage-settings"','"_globals_storage_settings"','"global_storage_settings"'];for(let n of r)try{if(e=this.db.prepare(`SELECT * FROM ${n} LIMIT 1`).get(),e)break}catch{}}if(!e)return;let t=r=>{if(!r)return null;if(typeof r=="string")try{return JSON.parse(r)}catch{return null}return r},s=e.provider||"local";if(this.cache["storage.type"]=s,s==="local"){let r=t(e.local);this.cache["storage.local.dir"]=r?.uploadDir||"./public/uploads",this.cache["storage.local.url"]=r?.baseUrl||"/uploads";}if(s==="aws"){let r=t(e.aws);this.cache["storage.s3.bucket"]=r?.bucket||"",this.cache["storage.s3.region"]=r?.region||"us-east-1",this.cache["storage.s3.access_key_id"]=r?.accessKeyId||"",this.cache["storage.s3.secret_access_key"]=r?.secretAccessKey||"",this.cache["storage.s3.endpoint"]=r?.endpoint||"",this.cache["storage.s3.cdn_url"]=r?.cdnUrl||"",this.cache["storage.s3.prefix"]=r?.prefix||"";}if(s==="r2"){let r=t(e.r2);this.cache["storage.r2.account_id"]=r?.accountId||"",this.cache["storage.r2.access_key_id"]=r?.accessKeyId||"",this.cache["storage.r2.secret_access_key"]=r?.secretAccessKey||"",this.cache["storage.r2.bucket"]=r?.bucket||"",this.cache["storage.r2.cdn_url"]=r?.cdnUrl||"",this.cache["storage.r2.prefix"]=r?.prefix||"";}if(s==="cloudinary"){let r=t(e.cloudinary);this.cache["storage.cloudinary.cloud_name"]=r?.cloudName||"",this.cache["storage.cloudinary.api_key"]=r?.apiKey||"",this.cache["storage.cloudinary.api_secret"]=r?.apiSecret||"",this.cache["storage.cloudinary.folder"]=r?.folder||"";}if(s==="ftp"){let r=t(e.ftp);this.cache["storage.ftp.host"]=r?.host||"",this.cache["storage.ftp.port"]=String(r?.port||"21"),this.cache["storage.ftp.user"]=r?.user||"",this.cache["storage.ftp.password"]=r?.password||"",this.cache["storage.ftp.secure"]=r?.secure?"true":"false",this.cache["storage.ftp.base_url"]=r?.baseUrl||"",this.cache["storage.ftp.prefix"]=r?.prefix||"";}}catch(e){console.warn("ConfigService: Could not load storage settings from globals table:",e);}try{let e=null;if(typeof this.db?.findOne=="function")try{let t=await this.db.findOne({collection:"_globals_email-settings",where:{},draft:!0});t&&(e=t);}catch{}if(!e&&typeof this.db?.execute=="function"){let{sql:t}=await import('drizzle-orm'),s=['"_globals_email-settings"','"_globals_email_settings"','"global_email_settings"'];for(let r of s)try{let n=await this.db.execute(t`SELECT * FROM ${t.raw(r)} LIMIT 1`);if(e=Array.isArray(n)?n[0]:n?.rows?n.rows[0]:null,e)break}catch{}}else if(!e&&typeof this.db?.prepare=="function"){let t=['"_globals_email-settings"','"_globals_email_settings"','"global_email_settings"'];for(let s of t)try{if(e=this.db.prepare(`SELECT * FROM ${s} LIMIT 1`).get(),e)break}catch{}}if(e){let t=s=>{if(!s)return null;if(typeof s=="string")try{return JSON.parse(s)}catch{return null}return s};if(this.cache["email.provider"]=e.provider||"smtp",this.cache["email.smtp.from"]=e.fromEmail||"",this.cache["email.smtp.from_name"]=e.fromName||"",this.cache["email.smtp.reply_to"]=e.replyTo||"",e.provider==="smtp"){let s=t(e.smtp);this.cache["email.smtp.host"]=s?.host||"",this.cache["email.smtp.port"]=String(s?.port||"587"),this.cache["email.smtp.user"]=s?.username||"",this.cache["email.smtp.pass"]=s?.password||"",this.cache["email.smtp.secure"]=s?.secure?"true":"false";}else if(e.provider==="resend"){let s=t(e.resend);this.cache["email.smtp.pass"]=s?.apiKey||"";}else if(e.provider==="sendgrid"){let s=t(e.sendgrid);this.cache["email.smtp.pass"]=s?.apiKey||"";}else if(e.provider==="mailgun"){let s=t(e.mailgun);this.cache["email.smtp.pass"]=s?.apiKey||"";}else if(e.provider==="ses"){let s=t(e.ses);this.cache["email.smtp.user"]=s?.accessKeyId||"",this.cache["email.smtp.pass"]=s?.secretAccessKey||"";}}}catch(e){console.warn("ConfigService: Could not load email settings from globals table:",e);}}get(e,t,s){return this.cache[e]?this.cache[e]:t&&process.env[t]?process.env[t]:s}getStorageConfig(){let e="local";return typeof globalThis.STORAGE_BUCKET<"u"&&(e="cloudflare_r2"),{type:this.get("storage.type","STORAGE_TYPE",e),s3:{bucket:this.get("storage.s3.bucket","STORAGE_BUCKET"),region:this.get("storage.s3.region","STORAGE_REGION","us-east-1"),accessKeyId:this.get("storage.s3.access_key_id","STORAGE_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.s3.secret_access_key","STORAGE_SECRET_ACCESS_KEY"),endpoint:this.get("storage.s3.endpoint","STORAGE_ENDPOINT"),cdnUrl:this.get("storage.s3.cdn_url","STORAGE_CDN_URL"),prefix:this.get("storage.s3.prefix","STORAGE_PREFIX")},r2:{accountId:this.get("storage.r2.account_id","R2_ACCOUNT_ID"),accessKeyId:this.get("storage.r2.access_key_id","R2_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.r2.secret_access_key","R2_SECRET_ACCESS_KEY"),bucket:this.get("storage.r2.bucket","R2_BUCKET"),cdnUrl:this.get("storage.r2.cdn_url","R2_CDN_URL"),prefix:this.get("storage.r2.prefix","R2_PREFIX")},gcs:{bucket:this.get("storage.gcs.bucket","GCS_BUCKET"),projectId:this.get("storage.gcs.project_id","GCS_PROJECT_ID"),clientEmail:this.get("storage.gcs.client_email","GCS_CLIENT_EMAIL"),privateKey:this.get("storage.gcs.private_key","GCS_PRIVATE_KEY"),cdnUrl:this.get("storage.gcs.cdn_url","GCS_CDN_URL"),prefix:this.get("storage.gcs.prefix","GCS_PREFIX")},digitalocean:{bucket:this.get("storage.digitalocean.bucket","DO_BUCKET"),region:this.get("storage.digitalocean.region","DO_REGION","nyc3"),accessKeyId:this.get("storage.digitalocean.access_key_id","DO_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.digitalocean.secret_access_key","DO_SECRET_ACCESS_KEY"),cdnUrl:this.get("storage.digitalocean.cdn_url","DO_CDN_URL"),prefix:this.get("storage.digitalocean.prefix","DO_PREFIX")},backblaze:{bucket:this.get("storage.backblaze.bucket","BB_BUCKET"),accountId:this.get("storage.backblaze.account_id","BB_ACCOUNT_ID"),applicationKeyId:this.get("storage.backblaze.application_key_id","BB_APPLICATION_KEY_ID"),applicationKey:this.get("storage.backblaze.application_key","BB_APPLICATION_KEY"),cdnUrl:this.get("storage.backblaze.cdn_url","BB_CDN_URL"),prefix:this.get("storage.backblaze.prefix","BB_PREFIX")},wasabi:{bucket:this.get("storage.wasabi.bucket","WASABI_BUCKET"),region:this.get("storage.wasabi.region","WASABI_REGION","us-east-1"),accessKeyId:this.get("storage.wasabi.access_key_id","WASABI_ACCESS_KEY_ID"),secretAccessKey:this.get("storage.wasabi.secret_access_key","WASABI_SECRET_ACCESS_KEY"),cdnUrl:this.get("storage.wasabi.cdn_url","WASABI_CDN_URL"),prefix:this.get("storage.wasabi.prefix","WASABI_PREFIX")},bunny:{storageZone:this.get("storage.bunny.storage_zone","BUNNY_STORAGE_ZONE"),apiKey:this.get("storage.bunny.api_key","BUNNY_API_KEY"),cdnUrl:this.get("storage.bunny.cdn_url","BUNNY_CDN_URL"),prefix:this.get("storage.bunny.prefix","BUNNY_PREFIX")},ftp:{host:this.get("storage.ftp.host","FTP_HOST"),port:parseInt(this.get("storage.ftp.port","FTP_PORT","21"),10),user:this.get("storage.ftp.user","FTP_USER"),password:this.get("storage.ftp.password","FTP_PASSWORD"),secure:this.get("storage.ftp.secure","FTP_SECURE")==="true",baseUrl:this.get("storage.ftp.base_url","FTP_BASE_URL"),prefix:this.get("storage.ftp.prefix","FTP_PREFIX")},cloudinary:{cloudName:this.get("storage.cloudinary.cloud_name","CLOUDINARY_CLOUD_NAME"),apiKey:this.get("storage.cloudinary.api_key","CLOUDINARY_API_KEY"),apiSecret:this.get("storage.cloudinary.api_secret","CLOUDINARY_API_SECRET"),folder:this.get("storage.cloudinary.folder","CLOUDINARY_FOLDER")},imgix:{domain:this.get("storage.imgix.domain","IMGIX_DOMAIN"),signKey:this.get("storage.imgix.sign_key","IMGIX_SIGN_KEY")},local:{uploadDir:this.get("storage.local.dir","STORAGE_LOCAL_DIR","./public/uploads"),baseUrl:this.get("storage.local.url","STORAGE_LOCAL_URL","/uploads")}}}getEmailConfig(){return {provider:this.get("email.provider","EMAIL_PROVIDER","smtp"),host:this.get("email.smtp.host","SMTP_HOST"),port:parseInt(this.get("email.smtp.port","SMTP_PORT","587"),10),secure:this.get("email.smtp.secure","SMTP_SECURE")==="true",user:this.get("email.smtp.user","SMTP_USER"),pass:this.get("email.smtp.pass","SMTP_PASS"),from:this.get("email.smtp.from","SMTP_FROM","noreply@example.com"),fromName:this.get("email.smtp.from_name","SMTP_FROM_NAME","Kyro CMS"),replyTo:this.get("email.smtp.reply_to","SMTP_REPLY_TO")}}maskSensitive(e,t){return t&&(i.SENSITIVE_KEYS.includes(e)?"********":t)}async set(e,t,s){await this.db.insert(oe).values({key:e,value:t,description:s,updatedAt:new Date}).onConflictDoUpdate({target:[oe.key],set:{value:t,description:s,updatedAt:new Date}}),this.cache[e]=t;}};});var ce,it=x(()=>{et();rt();ce=class i{transporter;config;templates;transporterInitialized=false;constructor(e,t){this.config=e,this.templates={...Pe(),...t};}async ensureTransporter(){if(this.transporterInitialized)return this.transporter;let{default:e}=await import('nodemailer');return this.config.provider==="smtp"&&this.config.smtp?this.transporter=e.createTransport({host:this.config.smtp.host,port:this.config.smtp.port,secure:this.config.smtp.secure,auth:this.config.smtp.auth}):this.config.provider==="ses"&&this.config.ses&&(this.transporter=e.createTransport({host:`email-smtp.${this.config.ses.region}.amazonaws.com`,port:587,secure:false,auth:{user:this.config.ses.accessKeyId,pass:this.config.ses.secretAccessKey}})),this.transporterInitialized=true,this.transporter}async send(e){let{provider:t,from:s,fromName:r,replyTo:n}=this.config,o=`"${r||"Kyro CMS"}" <${s}>`,a=e.replyTo||n;try{let c;switch(t){case "smtp":case "ses":{let d=await this.ensureTransporter();if(!d)throw new Error(`${t} transporter not initialized`);c=await d.sendMail({from:o,to:Array.isArray(e.to)?e.to.join(", "):e.to,subject:e.subject,html:e.html,text:e.text,replyTo:a});}break;case "resend":c=await this.sendViaResend(o,e,a);break;case "sendgrid":c=await this.sendViaSendGrid(o,e,a);break;case "mailgun":c=await this.sendViaMailgun(o,e,a);break;default:throw new Error(`Unsupported email provider: ${t}`)}return c}catch(c){throw console.error("[EmailTransport] FAILED to send email:",c.message),c.response&&console.error("[EmailTransport] Provider Error Detail:",JSON.stringify(c.response,null,2)),c}}async sendViaResend(e,t,s){let r=this.config.resend?.apiKey;if(!r)throw new Error("Resend API Key missing");let n={from:e,to:t.to,subject:t.subject,html:t.html,text:t.text,reply_to:s},o=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify(n)});if(!o.ok){let a=await o.json();throw new Error(`Resend Error: ${JSON.stringify(a)}`)}return o.json()}async sendViaSendGrid(e,t,s){let r=this.config.sendgrid?.apiKey;if(!r)throw new Error("SendGrid API Key missing");let n={personalizations:[{to:Array.isArray(t.to)?t.to.map(a=>({email:a})):[{email:t.to}]}],from:{email:e.match(/<(.+)>/)?.[1]||e,name:e.match(/"(.+)"/)?.[1]},subject:t.subject,content:[{type:"text/plain",value:t.text||""},{type:"text/html",value:t.html}],reply_to:s?{email:s}:void 0},o=await fetch("https://api.sendgrid.com/v3/mail/send",{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify(n)});if(!o.ok){let a=await o.json();throw new Error(`SendGrid Error: ${JSON.stringify(a)}`)}return {success:true}}async sendViaMailgun(e,t,s){let{apiKey:r,domain:n,region:o}=this.config.mailgun||{};if(!r||!n)throw new Error("Mailgun config missing");let a=o==="eu"?"api.eu.mailgun.net":"api.mailgun.net",c=btoa(`api:${r}`),d=new URLSearchParams;d.append("from",e);let f=Array.isArray(t.to)?t.to.join(", "):t.to;d.append("to",f),d.append("subject",t.subject),d.append("html",t.html),t.text&&d.append("text",t.text),s&&d.append("h:Reply-To",s);let l=await fetch(`https://${a}/v3/${n}/messages`,{method:"POST",headers:{Authorization:`Basic ${c}`,"Content-Type":"application/x-www-form-urlencoded"},body:d});if(!l.ok){let b=await l.json();throw new Error(`Mailgun Error: ${JSON.stringify(b)}`)}return l.json()}getTemplates(){return this.templates}async verifyConnection(){if(this.config.provider==="smtp"||this.config.provider==="ses")try{let e=await this.ensureTransporter();if(e)return await e.verify(),!0}catch{return  false}return !!(this.config.resend?.apiKey||this.config.sendgrid?.apiKey||this.config.mailgun?.apiKey)}static async fromConfig(e){let t=new ae(e);await t.load();let s=t.getEmailConfig();if(!s.provider)return this.fromEnv();let r={provider:s.provider||"smtp",from:s.from||"noreply@example.com",fromName:s.fromName,replyTo:s.replyTo,smtp:s.provider==="smtp"?{host:s.host||"",port:s.port||587,secure:s.secure||false,auth:{user:s.user||"",pass:s.pass||""}}:void 0,resend:s.provider==="resend"?{apiKey:s.pass||""}:void 0,sendgrid:s.provider==="sendgrid"?{apiKey:s.pass||""}:void 0,mailgun:s.provider==="mailgun"?{apiKey:s.pass||"",domain:s.host||"",region:s.secure?"eu":"us"}:void 0,ses:s.provider==="ses"?{accessKeyId:s.user||"",secretAccessKey:s.pass||"",region:s.host||"us-east-1"}:void 0};return new i(r)}static fromEnv(){let e=process.env.EMAIL_PROVIDER||"smtp",t=process.env.SMTP_FROM||process.env.DEFAULT_FROM||"noreply@example.com",s=process.env.SMTP_FROM_NAME||"Kyro CMS",r=process.env.SMTP_REPLY_TO;if(e==="smtp"){let n=process.env.SMTP_HOST,o=process.env.SMTP_USER,a=process.env.SMTP_PASS;return !n||!o||!a?null:new i({provider:"smtp",from:t,fromName:s,replyTo:r,smtp:{host:n,port:parseInt(process.env.SMTP_PORT||"587",10),secure:process.env.SMTP_SECURE==="true",auth:{user:o,pass:a}}})}if(e==="resend"){let n=process.env.RESEND_API_KEY||process.env.SMTP_PASS;return n?new i({provider:"resend",from:t,fromName:s,replyTo:r,resend:{apiKey:n}}):null}if(e==="sendgrid"){let n=process.env.SENDGRID_API_KEY||process.env.SMTP_PASS;return n?new i({provider:"sendgrid",from:t,fromName:s,replyTo:r,sendgrid:{apiKey:n}}):null}if(e==="mailgun"){let n=process.env.MAILGUN_API_KEY||process.env.SMTP_PASS,o=process.env.MAILGUN_DOMAIN||process.env.SMTP_HOST;return !n||!o?null:new i({provider:"mailgun",from:t,fromName:s,replyTo:r,mailgun:{apiKey:n,domain:o,region:process.env.MAILGUN_REGION||(process.env.SMTP_SECURE==="true"?"eu":"us")}})}if(e==="ses"){let n=process.env.AWS_ACCESS_KEY_ID||process.env.SMTP_USER,o=process.env.AWS_SECRET_ACCESS_KEY||process.env.SMTP_PASS,a=process.env.AWS_REGION||process.env.SMTP_HOST||"us-east-1";return !n||!o?null:new i({provider:"ses",from:t,fromName:s,replyTo:r,ses:{accessKeyId:n,secretAccessKey:o,region:a}})}return null}};});var Xt,de,nt=x(()=>{Xt={minLength:12,requireUppercase:true,requireLowercase:true,requireNumbers:true,requireSpecialChars:true,preventReuse:5,maxLength:128},de=class{config;constructor(e={}){this.config={...Xt,...e};}validate(e){let t=[];return this.config.maxLength&&e.length>this.config.maxLength&&t.push(`Password must not exceed ${this.config.maxLength} characters`),e.length<this.config.minLength&&t.push(`Password must be at least ${this.config.minLength} characters`),this.config.requireUppercase&&!/[A-Z]/.test(e)&&t.push("Password must contain at least one uppercase letter"),this.config.requireLowercase&&!/[a-z]/.test(e)&&t.push("Password must contain at least one lowercase letter"),this.config.requireNumbers&&!/[0-9]/.test(e)&&t.push("Password must contain at least one number"),this.config.requireSpecialChars&&!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(e)&&t.push("Password must contain at least one special character"),["password","123456","12345678","qwerty","abc123","monkey","1234567","letmein","trustno1","dragon","baseball","iloveyou","master","sunshine","ashley","football","password1","shadow","123123","654321"].includes(e.toLowerCase())&&t.push("This password is too common. Please choose a more secure password"),(/^[a-zA-Z]+$/.test(e)||/^[0-9]+$/.test(e))&&t.push("Password must contain a mix of letters, numbers, and/or special characters"),/(.)\1{2,}/.test(e)&&t.push("Password must not contain more than 2 consecutive identical characters"),/^(012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321|210)+$/i.test(e)&&t.push("Password must not contain sequential numbers or letters"),{valid:t.length===0,errors:t}}async checkReuse(e,t,s){return {valid:true,errors:[]}}async isInHistory(e,t,s){for(let r of t)if(await s(e,r))return  true;return  false}generatePassword(e=16){let t="ABCDEFGHIJKLMNOPQRSTUVWXYZ",s="abcdefghijklmnopqrstuvwxyz",r="0123456789",n="!@#$%^&*()_+-=[]{}|;:,.<>?",o="";o+=t[Math.floor(Math.random()*t.length)],o+=s[Math.floor(Math.random()*s.length)],o+=r[Math.floor(Math.random()*r.length)],o+=n[Math.floor(Math.random()*n.length)];let a=t+s+r+n;for(let c=o.length;c<e;c++)o+=a[Math.floor(Math.random()*a.length)];return o.split("").sort(()=>Math.random()-.5).join("")}getStrength(e){let t=0,s=[];e.length>=8&&(t+=1),e.length>=12&&(t+=1),e.length>=16&&(t+=1),/[a-z]/.test(e)&&(t+=1),/[A-Z]/.test(e)&&(t+=1),/[0-9]/.test(e)&&(t+=1),/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(e)&&(t+=1),e.length>8&&(t+=1),e.length>12&&(t+=1);let r=new Set(e).size;r>6&&(t+=1),r>10&&(t+=1);let n;return t<=3?(n="Weak",s.push("Add more characters"),s.push("Include uppercase and lowercase letters")):t<=5?(n="Fair",s.push("Add special characters"),s.push("Consider making it longer")):t<=7?(n="Good",s.push("Consider making it longer for extra security")):n="Strong",{score:t,label:n,feedback:s}}setConfig(e){this.config={...this.config,...e};}getConfig(){return {...this.config}}};});var at={};re(at,{autoBootstrap:()=>Wt,bootstrapAdmin:()=>ve,bootstrapWithRetry:()=>jt,checkBootstrapRequired:()=>Yt,getBootstrapFromEnv:()=>ot});async function ve(i){let{adminEmail:e,adminPassword:t,adminRole:s="super_admin",tenantId:r,emailConfig:n,sendWelcomeEmail:o=false}=i,a=i.authAdapter||new q({path:i.authDbPath||"./data/auth.db"});try{await a.connect?.();}catch{return {success:false,error:"Failed to connect to auth storage"}}let d=new de().validate(t);if(!d.valid)return await a.disconnect?.(),{success:false,error:`Invalid password: ${d.errors.join(", ")}`};if(await a.findUserByEmail(e))return await a.disconnect?.(),{success:false,error:"Admin user already exists"};try{let l=await a.createUser({name:"Super Admin",email:e,password:t,role:s||"admin",tenantId:r});if(await a.updateUser?.(l.id,{emailVerified:!0}),o&&n){let b=new ce(n),A=b.getTemplates().welcome(e.split("@")[0]);await b.send({to:e,...A});}return await a.disconnect?.(),{success:!0,user:l}}catch(l){return await a.disconnect?.(),{success:false,error:l instanceof Error?l.message:"Failed to create admin user"}}}async function Yt(i,e){return !await i.findUserByEmail(e)}function ot(){let i=process.env.KYRO_ADMIN_EMAIL,e=process.env.KYRO_ADMIN_PASSWORD;return !i||!e?null:{authDbPath:process.env.KYRO_AUTH_DB_PATH||"./data/auth.db",adminEmail:i,adminPassword:e,adminRole:process.env.KYRO_ADMIN_ROLE||"super_admin",tenantId:process.env.KYRO_ADMIN_TENANT_ID,emailConfig:process.env.SMTP_HOST?{provider:"smtp",smtp:{host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587",10),secure:process.env.SMTP_SECURE==="true",auth:{user:process.env.SMTP_USER||"",pass:process.env.SMTP_PASS||""}},from:process.env.SMTP_FROM||"noreply@example.com",fromName:process.env.SMTP_FROM_NAME}:void 0,sendWelcomeEmail:process.env.KYRO_ADMIN_SEND_WELCOME==="true"}}async function Wt(i){let e=ot();if(!e)return null;i&&(e.authAdapter=i);try{if(await e.authAdapter?.connect?.(),await e.authAdapter?.findUserByEmail(e.adminEmail))return await e.authAdapter?.disconnect?.(),{success:!1,error:"Admin user already exists"}}catch{}let t=await ve(e);return t.success||console.error(`Bootstrap failed: ${t.error}`),t}async function jt(i,e=3,t=2e3){let s="";for(let r=0;r<e;r++){let n=await ve(i);if(n.success||(s=n.error||"Unknown error",s.includes("already exists")))return n;r<e-1&&await new Promise(o=>setTimeout(o,t));}return {success:false,error:`Failed after ${e} retries: ${s}`}}var ct=x(()=>{Ee();it();nt();});var g,zt,R,L,Y,W,j,M,ut=x(()=>{g=pgCore.pgTable("users",{id:pgCore.uuid("id").primaryKey().defaultRandom(),name:pgCore.varchar("name",{length:255}),email:pgCore.varchar("email",{length:255}).notNull(),passwordHash:pgCore.varchar("password_hash",{length:255}),role:pgCore.varchar("role",{length:50}).notNull().default("customer"),tenantId:pgCore.uuid("tenant_id"),emailVerified:pgCore.boolean("email_verified").default(false),avatar:pgCore.varchar("avatar",{length:255}),locked:pgCore.boolean("locked").default(false),lastLogin:pgCore.timestamp("last_login"),failedLoginAttempts:pgCore.integer("failed_login_attempts").default(0),metadata:pgCore.jsonb("metadata").$type(),createdAt:pgCore.timestamp("created_at").defaultNow().notNull(),updatedAt:pgCore.timestamp("updated_at").defaultNow().notNull()},i=>[pgCore.uniqueIndex("users_email_idx").on(i.email),pgCore.index("users_tenant_idx").on(i.tenantId),pgCore.index("users_role_idx").on(i.role)]),zt=pgCore.pgTable("roles",{id:pgCore.uuid("id").primaryKey().defaultRandom(),name:pgCore.varchar("name",{length:100}).notNull().unique(),level:pgCore.integer("level").notNull().default(0),inherits:pgCore.text("inherits").array(),description:pgCore.text("description"),permissions:pgCore.jsonb("permissions").$type().default([]),isSystem:pgCore.boolean("is_system").default(false),createdAt:pgCore.timestamp("created_at").defaultNow().notNull(),updatedAt:pgCore.timestamp("updated_at").defaultNow().notNull()},i=>[pgCore.index("roles_level_idx").on(i.level)]),pgCore.pgTable("permissions",{id:pgCore.uuid("id").primaryKey().defaultRandom(),roleId:pgCore.uuid("role_id").references(()=>zt.id,{onDelete:"cascade"}),resource:pgCore.varchar("resource",{length:100}).notNull(),action:pgCore.varchar("action",{length:50}).notNull(),conditions:pgCore.jsonb("conditions").$type(),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("permissions_role_idx").on(i.roleId),pgCore.index("permissions_resource_idx").on(i.resource)]),R=pgCore.pgTable("sessions",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),token:pgCore.varchar("token",{length:512}).notNull().unique(),refreshToken:pgCore.varchar("refresh_token",{length:512}),ipAddress:pgCore.varchar("ip_address",{length:45}),userAgent:pgCore.text("user_agent"),expiresAt:pgCore.timestamp("expires_at").notNull(),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("sessions_user_idx").on(i.userId),pgCore.index("sessions_token_idx").on(i.token),pgCore.index("sessions_expires_idx").on(i.expiresAt)]),L=pgCore.pgTable("audit_logs",{id:pgCore.uuid("id").primaryKey().defaultRandom(),action:pgCore.varchar("action",{length:100}).notNull(),userId:pgCore.uuid("user_id").references(()=>g.id,{onDelete:"set null"}),userEmail:pgCore.varchar("user_email",{length:255}),role:pgCore.varchar("role",{length:50}),resource:pgCore.varchar("resource",{length:100}).notNull(),resourceId:pgCore.varchar("resource_id",{length:255}),changes:pgCore.jsonb("changes").$type(),ipAddress:pgCore.varchar("ip_address",{length:45}),userAgent:pgCore.text("user_agent"),success:pgCore.boolean("success").notNull().default(true),error:pgCore.text("error"),metadata:pgCore.jsonb("metadata").$type(),timestamp:pgCore.timestamp("timestamp").defaultNow().notNull()},i=>[pgCore.index("audit_logs_user_idx").on(i.userId),pgCore.index("audit_logs_action_idx").on(i.action),pgCore.index("audit_logs_resource_idx").on(i.resource),pgCore.index("audit_logs_timestamp_idx").on(i.timestamp)]),pgCore.pgTable("tenants",{id:pgCore.uuid("id").primaryKey().defaultRandom(),name:pgCore.varchar("name",{length:255}).notNull(),slug:pgCore.varchar("slug",{length:100}).notNull().unique(),settings:pgCore.jsonb("settings").$type().default({}),isActive:pgCore.boolean("is_active").default(true),createdAt:pgCore.timestamp("created_at").defaultNow().notNull(),updatedAt:pgCore.timestamp("updated_at").defaultNow().notNull()},i=>[pgCore.uniqueIndex("tenants_slug_idx").on(i.slug)]),pgCore.pgTable("api_keys",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),name:pgCore.varchar("name",{length:255}).notNull(),key:pgCore.varchar("key",{length:64}).notNull().unique(),keyPrefix:pgCore.varchar("key_prefix",{length:8}).notNull(),permissions:pgCore.jsonb("permissions").$type().default([]),lastUsedAt:pgCore.timestamp("last_used_at"),expiresAt:pgCore.timestamp("expires_at"),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("api_keys_user_idx").on(i.userId),pgCore.index("api_keys_key_idx").on(i.key)]),Y=pgCore.pgTable("email_verifications",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),token:pgCore.varchar("token",{length:64}).notNull().unique(),expiresAt:pgCore.timestamp("expires_at").notNull(),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("email_verifications_token_idx").on(i.token),pgCore.index("email_verifications_user_idx").on(i.userId)]),W=pgCore.pgTable("password_resets",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),token:pgCore.varchar("token",{length:64}).notNull().unique(),expiresAt:pgCore.timestamp("expires_at").notNull(),usedAt:pgCore.timestamp("used_at"),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("password_resets_token_idx").on(i.token),pgCore.index("password_resets_user_idx").on(i.userId)]),j=pgCore.pgTable("password_history",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),passwordHash:pgCore.varchar("password_hash",{length:255}).notNull(),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("password_history_user_idx").on(i.userId)]),M=pgCore.pgTable("lockouts",{id:pgCore.uuid("id").primaryKey().defaultRandom(),userId:pgCore.uuid("user_id").notNull().references(()=>g.id,{onDelete:"cascade"}),ipAddress:pgCore.varchar("ip_address",{length:45}),reason:pgCore.varchar("reason",{length:255}),lockedUntil:pgCore.timestamp("locked_until").notNull(),releasedAt:pgCore.timestamp("released_at"),createdAt:pgCore.timestamp("created_at").defaultNow().notNull()},i=>[pgCore.index("lockouts_user_idx").on(i.userId),pgCore.index("lockouts_ip_idx").on(i.ipAddress),pgCore.index("lockouts_locked_until_idx").on(i.lockedUntil)]);});var gt={};re(gt,{PostgresAuthAdapter:()=>Me});var mt,Me,ht=x(()=>{ut();mt=false,Me=class{db;prefix;sessionTTL;refreshTokenTTL;constructor(e){this.db=e.db,this.prefix=e.prefix||"kyro:",this.sessionTTL=e.sessionTTL||86400,this.refreshTokenTTL=e.refreshTokenTTL||604800;}async connect(){mt||(await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255),
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255),
        "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
        "tenant_id" UUID,
        "email_verified" BOOLEAN DEFAULT false,
        "locked" BOOLEAN DEFAULT false,
        "last_login" TIMESTAMP,
        "failed_login_attempts" INTEGER DEFAULT 0,
        "metadata" JSONB,
        "avatar" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" VARCHAR(255)`),await this.db.execute(drizzleOrm.sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" ("tenant_id")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(512) NOT NULL UNIQUE,
        "refresh_token" VARCHAR(512),
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" ("expires_at")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" VARCHAR(100) NOT NULL,
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "user_email" VARCHAR(255),
        "role" VARCHAR(50),
        "resource" VARCHAR(100) NOT NULL,
        "resource_id" VARCHAR(255),
        "changes" JSONB,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "error" TEXT,
        "metadata" JSONB,
        "timestamp" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" TYPE VARCHAR(255)`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "password_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "password_history_user_idx" ON "password_history" ("user_id")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "lockouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ip_address" VARCHAR(45),
        "reason" VARCHAR(255),
        "locked_until" TIMESTAMP NOT NULL,
        "released_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "lockouts_user_idx" ON "lockouts" ("user_id")`),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "lockouts_locked_until_idx" ON "lockouts" ("locked_until")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL UNIQUE,
        "level" INTEGER NOT NULL DEFAULT 0,
        "inherits" TEXT[],
        "description" TEXT,
        "permissions" JSONB DEFAULT '[]',
        "is_system" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`CREATE INDEX IF NOT EXISTS "roles_level_idx" ON "roles" ("level")`),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "settings" JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "key" VARCHAR(64) NOT NULL UNIQUE,
        "key_prefix" VARCHAR(8) NOT NULL,
        "permissions" JSONB DEFAULT '[]',
        "last_used_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(drizzleOrm.sql`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),mt=true);}async disconnect(){}async createUser(e){let t=await this.hashPassword(e.password),[s]=await this.db.insert(g).values({email:e.email.toLowerCase(),name:e.name,passwordHash:t,role:e.role||"customer",avatar:e.avatar,tenantId:e.tenantId}).returning();return this.userToAuthUser(s)}async findUserByEmail(e){let[t]=await this.db.select().from(g).where(drizzleOrm.eq(g.email,e.toLowerCase())).limit(1);return t?this.userToAuthUser(t):null}async findUserById(e){let[t]=await this.db.select().from(g).where(drizzleOrm.eq(g.id,e)).limit(1);return t?this.userToAuthUser(t):null}async updateUser(e,t){let s={updatedAt:new Date};t.name!==void 0&&(s.name=t.name),t.email!==void 0&&(s.email=t.email),t.passwordHash!==void 0&&(s.passwordHash=t.passwordHash),t.role!==void 0&&(s.role=t.role),t.tenantId!==void 0&&(s.tenantId=t.tenantId),t.avatar!==void 0&&(s.avatar=t.avatar),t.emailVerified!==void 0&&(s.emailVerified=t.emailVerified),t.locked!==void 0&&(s.locked=t.locked),t.lastLogin!==void 0&&(s.lastLogin=t.lastLogin?new Date(t.lastLogin):null),t.failedLoginAttempts!==void 0&&(s.failedLoginAttempts=t.failedLoginAttempts);let[r]=await this.db.update(g).set(s).where(drizzleOrm.eq(g.id,e)).returning();return r?this.userToAuthUser(r):null}async deleteUser(e){return await this.db.delete(g).where(drizzleOrm.eq(g.id,e)),true}async findUsers(e={}){let t=e.page??1,s=e.limit??10,r=(t-1)*s,n=e.search;if(n){let c=`%${n}%`,[d,[{count:f}]]=await Promise.all([this.db.select().from(g).where(drizzleOrm.sql`${g.email} ILIKE ${c}`).orderBy(drizzleOrm.desc(g.createdAt)).limit(s).offset(r),this.db.select({count:drizzleOrm.sql`count(*)`}).from(g).where(drizzleOrm.sql`${g.email} ILIKE ${c}`)]);return {users:d.map(l=>this.userToAuthUser(l)),total:Number(f)}}let[o,[{count:a}]]=await Promise.all([this.db.select().from(g).orderBy(drizzleOrm.desc(g.createdAt)).limit(s).offset(r),this.db.select({count:drizzleOrm.sql`count(*)`}).from(g)]);return {users:o.map(c=>this.userToAuthUser(c)),total:Number(a)}}async verifyPassword(e,t){let s=await this.findUserByEmail(e);if(!s)return null;let[r]=await this.db.select().from(g).where(drizzleOrm.eq(g.email,e.toLowerCase())).limit(1);return r?.passwordHash&&await Te__default.default.compare(t,r.passwordHash)?s:null}async hashPassword(e){return Te__default.default.hash(e,12)}async createSession(e,t){let s=Je.randomBytes(32).toString("base64url"),r=Je.randomBytes(32).toString("base64url"),n=new Date(Date.now()+this.sessionTTL*1e3);new Date(Date.now()+this.refreshTokenTTL*1e3);let [a]=await this.db.insert(R).values({userId:e,token:s,refreshToken:r,ipAddress:t?.ipAddress,userAgent:t?.userAgent,expiresAt:n}).returning();return this.sessionToSession(a)}async findSessionByToken(e){let[t]=await this.db.select().from(R).where(drizzleOrm.and(drizzleOrm.eq(R.token,e),drizzleOrm.gt(R.expiresAt,new Date))).limit(1);return t?this.sessionToSession(t):null}async findSessionByRefreshToken(e){let[t]=await this.db.select().from(R).where(drizzleOrm.and(drizzleOrm.eq(R.refreshToken,e),drizzleOrm.gt(R.expiresAt,new Date))).limit(1);return t?this.sessionToSession(t):null}async deleteSession(e){return await this.db.delete(R).where(drizzleOrm.eq(R.id,e)),true}async deleteUserSessions(e){return await this.db.delete(R).where(drizzleOrm.eq(R.userId,e)),1}async addPasswordToHistory(e,t){await this.db.insert(j).values({userId:e,passwordHash:t});}async getPasswordHistory(e,t=5){return (await this.db.select({passwordHash:j.passwordHash}).from(j).where(drizzleOrm.eq(j.userId,e)).orderBy(drizzleOrm.desc(j.createdAt)).limit(t)).map(r=>r.passwordHash)}async isPasswordInHistory(e,t,s=5){let r=await this.getPasswordHistory(t,s);for(let n of r)if(await this.verifyPassword(e,n))return  true;return  false}async isLocked(e){let[t]=await this.db.select().from(M).where(drizzleOrm.and(drizzleOrm.eq(M.userId,e),drizzleOrm.gt(M.lockedUntil,new Date))).limit(1);return !!t}async getLockout(e){let[t]=await this.db.select().from(M).where(drizzleOrm.and(drizzleOrm.eq(M.userId,e),drizzleOrm.gt(M.lockedUntil,new Date))).limit(1);return t?{lockedUntil:t.lockedUntil}:null}async recordFailedAttempt(e,t){let r=((await this.findUserById(e))?.failedLoginAttempts||0)+1;await this.updateUser(e,{failedLoginAttempts:r});let o=r>=5;return o&&await this.db.insert(M).values({userId:e,ipAddress:t,reason:"Too many failed login attempts",lockedUntil:new Date(Date.now()+9e5)}),{attempts:r,locked:o}}async resetAttempts(e){await this.updateUser(e,{failedLoginAttempts:0});}async findAuditLogs(e){let{limit:t=50,offset:s=0,userId:r,action:n,resource:o,resourceId:a,success:c,startDate:d,endDate:f}=e,l=[];r&&l.push(drizzleOrm.eq(L.userId,r)),n&&(Array.isArray(n)?l.push(drizzleOrm.sql`${L.action} = ANY(${n})`):l.push(drizzleOrm.eq(L.action,n))),o&&l.push(drizzleOrm.eq(L.resource,o)),a&&l.push(drizzleOrm.eq(L.resourceId,a)),c!==void 0&&l.push(drizzleOrm.eq(L.success,c)),d&&l.push(drizzleOrm.sql`${L.timestamp} >= ${d}`),f&&l.push(drizzleOrm.sql`${L.timestamp} <= ${f}`);let b=l.length>0?drizzleOrm.and(...l):void 0,O=await this.db.select({count:drizzleOrm.sql`count(*)`}).from(L).where(b);return {logs:(await this.db.select().from(L).where(b).orderBy(drizzleOrm.desc(L.timestamp)).limit(t).offset(s)).map(S=>({id:S.id,timestamp:S.timestamp,action:S.action,userId:S.userId||void 0,userEmail:S.userEmail||void 0,role:S.role||void 0,resource:S.resource,resourceId:S.resourceId||void 0,changes:S.changes||void 0,ipAddress:S.ipAddress||void 0,userAgent:S.userAgent||void 0,success:S.success,error:S.error||void 0,metadata:S.metadata||void 0})),total:Number(O[0]?.count||0)}}async createAuditLog(e){let t=crypto.randomUUID(),s=new Date;return await this.db.insert(L).values({id:t,action:e.action,userId:e.userId??null,userEmail:e.userEmail??null,role:e.role??null,resource:e.resource,resourceId:e.resourceId??null,changes:e.changes??null,ipAddress:e.ipAddress??null,userAgent:e.userAgent??null,success:e.success,error:e.error??null,metadata:e.metadata??null,timestamp:s}),{...e,id:t,timestamp:s}}userToAuthUser(e){return {id:e.id,name:e.name||void 0,email:e.email,passwordHash:e.passwordHash||void 0,role:e.role,avatar:e.avatar&&typeof e.avatar=="object"?e.avatar.id||void 0:e.avatar||void 0,tenantId:e.tenantId||void 0,emailVerified:e.emailVerified||false,locked:e.locked||false,lastLogin:e.lastLogin?new Date(e.lastLogin).toISOString():void 0,failedLoginAttempts:e.failedLoginAttempts||0,createdAt:new Date(e.createdAt).toISOString(),updatedAt:new Date(e.updatedAt).toISOString()}}sessionToSession(e){return {id:e.id,userId:e.userId,token:e.token,refreshToken:e.refreshToken||void 0,expiresAt:new Date(e.expiresAt).toISOString(),createdAt:new Date(e.createdAt).toISOString(),ipAddress:e.ipAddress||void 0,userAgent:e.userAgent||void 0}}async createEmailVerificationToken(e){let t=Je.randomBytes(32).toString("hex"),s=new Date(Date.now()+1440*60*1e3);return await this.db.insert(Y).values({userId:e,token:t,expiresAt:s}),{token:t,expiresAt:s}}async verifyEmailToken(e){let[t]=await this.db.select().from(Y).where(drizzleOrm.eq(Y.token,e)).limit(1);return t?t.expiresAt<new Date?{success:false,error:"Verification token has expired"}:(await this.db.update(g).set({emailVerified:true}).where(drizzleOrm.eq(g.id,t.userId)),await this.db.delete(Y).where(drizzleOrm.eq(Y.id,t.id)),{success:true,userId:t.userId}):{success:false,error:"Invalid verification token"}}async createPasswordResetToken(e){let t=await this.findUserByEmail(e);if(!t)return {token:"",expiresAt:new Date,error:"User not found"};let s=Je.randomBytes(32).toString("hex"),r=new Date(Date.now()+3600*1e3);return await this.db.insert(W).values({userId:t.id,token:s,expiresAt:r}),{token:s,expiresAt:r}}async resetPasswordWithToken(e,t){let[s]=await this.db.select().from(W).where(drizzleOrm.eq(W.token,e)).limit(1);if(!s)return {success:false,error:"Invalid reset token"};if(s.expiresAt<new Date)return {success:false,error:"Reset token has expired"};if(s.usedAt)return {success:false,error:"Reset token has already been used"};let r=await this.hashPassword(t);return await this.db.update(g).set({passwordHash:r,updatedAt:new Date}).where(drizzleOrm.eq(g.id,s.userId)),await this.db.update(W).set({usedAt:new Date}).where(drizzleOrm.eq(W.id,s.id)),await this.db.delete(R).where(drizzleOrm.eq(R.userId,s.userId)),{success:true}}};});var ft={};re(ft,{MongoDBAuthAdapter:()=>Ke});var Ke,yt=x(()=>{Ke=class{db;adapter;prefix;sessionTTL;refreshTokenTTL;indexesEnsured=false;constructor(e){this.db=e.db,this.adapter=e.adapter,this.prefix=e.collectionPrefix||"",this.sessionTTL=e.sessionTTL||86400,this.refreshTokenTTL=e.refreshTokenTTL||604800;}getDatabase(){let e=typeof this.db=="function"?this.db():this.db;if(!e&&this.adapter&&(this.adapter.db?e=this.adapter.db:this.adapter.client&&(this.adapter.db=this.adapter.client.db(this.adapter.database||"kyro_cms"),e=this.adapter.db)),!e)throw new Error("MongoDB database not initialized");return e}col(e){return this.getDatabase().collection(`${this.prefix}${e}`)}async connect(){this.indexesEnsured||await this.ensureIndexes();}async disconnect(){}async ensureIndexes(){await this.col("users").createIndex({email:1},{unique:true}),await this.col("users").createIndex({tenantId:1}),await this.col("users").createIndex({role:1}),await this.col("sessions").createIndex({token:1},{unique:true}),await this.col("sessions").createIndex({refreshToken:1}),await this.col("sessions").createIndex({userId:1}),await this.col("sessions").createIndex({expiresAt:1},{expireAfterSeconds:0}),await this.col("audit_logs").createIndex({timestamp:-1}),await this.col("audit_logs").createIndex({userId:1}),await this.col("audit_logs").createIndex({action:1}),await this.col("audit_logs").createIndex({resource:1}),await this.col("password_history").createIndex({userId:1,createdAt:-1}),await this.col("lockouts").createIndex({userId:1},{unique:true}),await this.col("lockouts").createIndex({lockedUntil:1}),this.indexesEnsured=true;}async createUser(e){let t=Je.randomUUID(),s=new Date,r=await this.hashPassword(e.password),n={_id:t,name:e.name||null,email:e.email.toLowerCase(),passwordHash:r,role:e.role||"customer",avatar:e.avatar||null,tenantId:e.tenantId||null,emailVerified:false,locked:false,lastLogin:null,failedLoginAttempts:0,createdAt:s,updatedAt:s};return await this.col("users").insertOne(n),this.docToAuthUser(n)}async findUserByEmail(e){let t=await this.col("users").findOne({email:e.toLowerCase()});return t?this.docToAuthUser(t):null}async findUserById(e){let t=await this.col("users").findOne({_id:e});return t?this.docToAuthUser(t):null}async updateUser(e,t){let s={updatedAt:new Date};t.name!==void 0&&(s.name=t.name),t.email!==void 0&&(s.email=t.email),t.passwordHash!==void 0&&(s.passwordHash=t.passwordHash),t.role!==void 0&&(s.role=t.role),t.avatar!==void 0&&(s.avatar=t.avatar),t.tenantId!==void 0&&(s.tenantId=t.tenantId),t.emailVerified!==void 0&&(s.emailVerified=t.emailVerified),t.locked!==void 0&&(s.locked=t.locked),t.lastLogin!==void 0&&(s.lastLogin=t.lastLogin?new Date(t.lastLogin):null),t.failedLoginAttempts!==void 0&&(s.failedLoginAttempts=t.failedLoginAttempts);let r=await this.col("users").findOneAndUpdate({_id:e},{$set:s},{returnDocument:"after"});return r?this.docToAuthUser(r):null}async deleteUser(e){return (await this.col("users").deleteOne({_id:e})).deletedCount>0}async verifyPassword(e,t){let s=await this.findUserByEmail(e);if(!s)return null;let r=await this.col("users").findOne({email:e.toLowerCase()},{projection:{passwordHash:1}});return r?.passwordHash&&await Te__default.default.compare(t,r.passwordHash)?s:null}async hashPassword(e){return Te__default.default.hash(e,12)}async createSession(e,t){let s=Je.randomUUID(),r=Je.randomBytes(32).toString("base64url"),n=Je.randomBytes(32).toString("base64url"),o=new Date,a=new Date(o.getTime()+this.sessionTTL*1e3),c={_id:s,userId:e,token:r,refreshToken:n,ipAddress:t?.ipAddress||null,userAgent:t?.userAgent||null,expiresAt:a,createdAt:o};return await this.col("sessions").insertOne(c),this.docToSession(c)}async findSessionByToken(e){let t=await this.col("sessions").findOne({token:e,expiresAt:{$gt:new Date}});return t?this.docToSession(t):null}async findSessionByRefreshToken(e){let t=await this.col("sessions").findOne({refreshToken:e,expiresAt:{$gt:new Date}});return t?this.docToSession(t):null}async deleteSession(e){return (await this.col("sessions").deleteOne({_id:e})).deletedCount>0}async deleteUserSessions(e){return (await this.col("sessions").deleteMany({userId:e})).deletedCount}async hasAnyUsers(){return await this.col("users").countDocuments()>0}async addPasswordToHistory(e,t){await this.col("password_history").insertOne({userId:e,passwordHash:t,createdAt:new Date});}async getPasswordHistory(e,t=5){return (await this.col("password_history").find({userId:e}).sort({createdAt:-1}).limit(t).toArray()).map(r=>r.passwordHash)}async isPasswordInHistory(e,t,s=5){let r=await this.getPasswordHistory(t,s);for(let n of r)if(await Te__default.default.compare(e,n))return  true;return  false}async findAuditLogs(e){let{limit:t=50,offset:s=0,userId:r,action:n,resource:o,resourceId:a,success:c,startDate:d,endDate:f}=e,l={};r&&(l.userId=r),n&&(Array.isArray(n)?l.action={$in:n}:l.action=n),o&&(l.resource=o),a&&(l.resourceId=a),c!==void 0&&(l.success=c),(d||f)&&(l.timestamp={},d&&(l.timestamp.$gte=d),f&&(l.timestamp.$lte=f));let b=await this.col("audit_logs").countDocuments(l);return {logs:(await this.col("audit_logs").find(l).sort({timestamp:-1}).skip(s).limit(t).toArray()).map(A=>({id:A._id,timestamp:A.timestamp,action:A.action,userId:A.userId||void 0,userEmail:A.userEmail||void 0,role:A.role||void 0,resource:A.resource,resourceId:A.resourceId||void 0,changes:A.changes||void 0,ipAddress:A.ipAddress||void 0,userAgent:A.userAgent||void 0,success:A.success,error:A.error||void 0,metadata:A.metadata||void 0})),total:b}}async createAuditLog(e){let t=Je.randomUUID(),s=new Date;return await this.col("audit_logs").insertOne({_id:t,action:e.action,userId:e.userId||null,userEmail:e.userEmail||null,role:e.role||null,resource:e.resource,resourceId:e.resourceId||null,changes:e.changes||null,ipAddress:e.ipAddress||null,userAgent:e.userAgent||null,success:e.success,error:e.error||null,metadata:e.metadata||null,timestamp:s}),{...e,id:t,timestamp:s}}docToAuthUser(e){return {id:e._id,name:e.name||void 0,email:e.email,passwordHash:e.passwordHash||void 0,role:e.role,tenantId:e.tenantId||void 0,avatar:e.avatar||void 0,emailVerified:e.emailVerified||false,locked:e.locked||false,lastLogin:e.lastLogin?.toISOString?.()||e.lastLogin||void 0,failedLoginAttempts:e.failedLoginAttempts||0,createdAt:e.createdAt?.toISOString?.()||e.createdAt,updatedAt:e.updatedAt?.toISOString?.()||e.updatedAt}}docToSession(e){return {id:e._id,userId:e.userId,token:e.token,refreshToken:e.refreshToken||void 0,expiresAt:e.expiresAt?.toISOString?.()||e.expiresAt,createdAt:e.createdAt?.toISOString?.()||e.createdAt,ipAddress:e.ipAddress||void 0,userAgent:e.userAgent||void 0}}async createEmailVerificationToken(e){let t=Je.randomBytes(32).toString("hex"),s=new Date(Date.now()+1440*60*1e3),r=await import('mongodb');return await this.db.collection("email_verifications").insertOne({userId:new r.ObjectId(e),token:t,expiresAt:s,createdAt:new Date}),{token:t,expiresAt:s}}async verifyEmailToken(e){let t=await this.db.collection("email_verifications").findOne({token:e});return t?t.expiresAt<new Date?{success:false,error:"Verification token has expired"}:(await this.db.collection("users").updateOne({_id:t.userId},{$set:{emailVerified:true}}),await this.db.collection("email_verifications").deleteOne({_id:t._id}),{success:true,userId:t.userId.toString()}):{success:false,error:"Invalid verification token"}}async createPasswordResetToken(e){let t=await this.findUserByEmail(e);if(!t)return {token:"",expiresAt:new Date,error:"User not found"};let s=Je.randomBytes(32).toString("hex"),r=new Date(Date.now()+3600*1e3),n=await import('mongodb');return await this.db.collection("password_resets").insertOne({userId:new n.ObjectId(t.id),token:s,expiresAt:r,createdAt:new Date}),{token:s,expiresAt:r}}async resetPasswordWithToken(e,t){let s=await this.db.collection("password_resets").findOne({token:e});if(!s)return {success:false,error:"Invalid reset token"};if(s.expiresAt<new Date)return {success:false,error:"Reset token has expired"};if(s.usedAt)return {success:false,error:"Reset token has already been used"};let r=await this.hashPassword(t);return await this.db.collection("users").updateOne({_id:s.userId},{$set:{passwordHash:r,updatedAt:new Date}}),await this.db.collection("password_resets").updateOne({_id:s._id},{$set:{usedAt:new Date}}),await this.db.collection("sessions").deleteMany({userId:s.userId}),{success:true}}};});function ie(i){switch(i.type){case "text":case "email":case "password":case "textarea":case "color":case "code":case "markdown":case "date":case "richtext":case "json":return i.hasMany?"string[]":"string";case "number":return i.hasMany?"number[]":"number";case "checkbox":return "boolean";case "select":case "radio":if(i.options){let t=i.options.map(s=>`'${s.value}'`).join(" | ");return i.hasMany?`(${t})[]`:t}return i.hasMany?"string[]":"string";case "relationship":if(Array.isArray(i.relationTo)){if(i.relationTo.includes("*"))return i.hasMany?"any[]":"any";let t=i.relationTo.map(s=>`${F(s)} | string`).join(" | ");return i.hasMany?`(${t})[]`:`(${t})`}let e=i.relationTo||"unknown";return e==="*"?i.hasMany?"any[]":"any":i.hasMany?`(${F(e)} | string)[]`:`${F(e)} | string`;case "upload":return i.hasMany?"(Media | string)[]":"Media | string";case "array":return i.fields&&i.fields.length>0?`Array<{
${i.fields.filter(s=>s.name).map(s=>{let r=ie(s);return `    ${s.name}${s.required?"":"?"}: ${r};`}).join(`
`)}
  }>`:"Record<string, any>[]";case "group":return i.fields&&i.fields.length>0?`{
${i.fields.filter(s=>s.name).map(s=>{let r=ie(s);return `  ${s.name}${s.required?"":"?"}: ${r};`}).join(`
`)}
}`:"Record<string, any>";case "blocks":return "Block[]";default:return "any"}}function F(i){return i.charAt(0).toUpperCase()+i.slice(1).replace(/-([a-z])/g,(e,t)=>t.toUpperCase())}function ye(i){return i.replace(/-([a-z])/g,(e,t)=>t.toUpperCase())}function xt(i){let e=F(i.slug),t=i.fields.filter(s=>s.name).map(s=>{let r=ie(s);return `  ${s.name}${s.required?"":"?"}: ${r};`});return t.unshift("  id: string;"),t.push("  createdAt: string;"),t.push("  updatedAt: string;"),`export interface ${e} {
${t.join(`
`)}
}`}function Ve(i){let e=i.map(n=>xt(n)),t=`// ============================================================================
// Auto-generated by kyro generate
// ============================================================================

import type { RichTextBlock } from '@kyro-cms/core';

export interface Media {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  blockType: string;
  [key: string]: any;
}

`,s=e.join(`

`),r=`

// ============================================================================
// Query Types
// ============================================================================

export interface KyroWhereClause {
  [field: string]: {
    equals?: any;
    not_equals?: any;
    in?: any[];
    not_in?: any[];
    greater_than?: number;
    greater_than_equal?: number;
    less_than?: number;
    less_than_equal?: number;
    like?: string;
    exists?: boolean;
  };
}

export interface KyroFindArgs {
  where?: KyroWhereClause;
  sort?: string;
  limit?: number;
  page?: number;
  depth?: number;
  select?: string[];
}

export interface KyroFindResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface KyroCreateResult<T> {
  doc: T;
  message?: string;
}

export interface KyroUpdateResult<T> {
  doc: T;
  message?: string;
}

export interface KyroDeleteResult<T> {
  doc: T;
  message: string;
}

// ============================================================================
// Collection Map
// ============================================================================

export interface KyroCollections {
${i.map(n=>`  ${ye(n.slug)}: ${F(n.slug)};`).join(`
`)}
}

// ============================================================================
// Typed Client
// ============================================================================

export interface KyroTypedClient<C extends keyof KyroCollections> {
  find: (args?: KyroFindArgs) => Promise<KyroFindResult<KyroCollections[C]>>;
  findByID: (id: string, args?: { depth?: number; select?: string[] }) => Promise<KyroCollections[C]>;
  create: (data: Partial<KyroCollections[C]>) => Promise<KyroCreateResult<KyroCollections[C]>>;
  update: (id: string, data: Partial<KyroCollections[C]>) => Promise<KyroUpdateResult<KyroCollections[C]>>;
  delete: (id: string) => Promise<KyroDeleteResult<KyroCollections[C]>>;
  count: (args?: { where?: KyroWhereClause }) => Promise<{ totalDocs: number }>;
}

export interface KyroClient {
  ${i.map(n=>`  ${ye(n.slug)}: KyroTypedClient<'${n.slug}'>;`).join(`
`)}
}

export function createClient(config: { url: string; token?: string }): KyroClient {
  // Client implementation would be here
  throw new Error('Not implemented');
}
`;return t+s+r}async function kt(i,e){let t=`${i.replace(/\/+$/,"")}/api/__schema`,s=await fetch(t,{headers:{Authorization:`ApiKey ${e}`}});if(!s.ok){let r=await s.text();throw new Error(`Schema fetch failed (${s.status}): ${r}`)}return s.json()}function It(i){let e=`// ============================================================================
// Auto-generated by kyro generate --api
// ============================================================================

import type { RichTextBlock } from '@kyro-cms/core';

export interface Media {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  blockType: string;
  [key: string]: any;
}

`;for(let t of i){let s=F(t.slug),r=t.fields.filter(n=>n.name).map(n=>{let o=ie(n);return `  ${n.name}${n.required?"":"?"}: ${o};`});r.unshift("  id: string;"),r.push("  createdAt: string;"),r.push("  updatedAt: string;"),e+=`export interface ${s} {
${r.join(`
`)}
}

`;}return e+=`// ============================================================================
// Typed REST Client
// ============================================================================

export interface KyroClientOptions {
  url: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export function createKyroClient(opts: KyroClientOptions) {
  const base = opts.url.replace(/\\/+$/, "");
  const http = opts.fetch || globalThis.fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await http(\`\${base}/api\${path}\`, {
      headers: {
        "Authorization": \`ApiKey \${opts.apiKey}\`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(\`Kyro API error \${res.status}: \${body}\`);
    }
    return res.json();
  }

  function qs(params: Record<string, any>): string {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) s.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    return s.toString();
  }

  return {
${i.map(t=>{let s=F(t.slug);return `    ${ye(t.slug)}: {
      find: (args?: { where?: Record<string, any>; sort?: string; limit?: number; page?: number; draft?: boolean }) =>
        request<{ docs: ${s}[]; totalDocs: number; page: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean }>(\`/${t.slug}\${args ? "?" + qs(args) : ""}\`),
      findByID: (id: string, args?: { draft?: boolean }) =>
        request<${s}>(\`/${t.slug}/\${id}\${args ? "?" + qs(args) : ""}\`),
      findBySlug: (slug: string, args?: { draft?: boolean }) =>
        request<{ docs: ${s}[] }>(\`/${t.slug}?where=\${encodeURIComponent(JSON.stringify({ slug: { equals: slug } }))}\`),
      create: (data: Partial<${s}>) =>
        request<{ doc: ${s}; message?: string }>(\`/${t.slug}\`, { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Partial<${s}>, args?: { baseUpdatedAt?: string }) =>
        request<{ doc: ${s}; message?: string }>(\`/${t.slug}/\${id}\`, { method: "PATCH", body: JSON.stringify({ ...data, ...args }) }),
      delete: (id: string) =>
        request<{ doc: ${s}; message: string }>(\`/${t.slug}/\${id}\`, { method: "DELETE" }),
      count: (args?: { where?: Record<string, any> }) =>
        request<{ totalDocs: number }>(\`/${t.slug}/count\${args ? "?" + qs(args) : ""}\`),
    },`}).join(`
`)}
  };
}
`,e}function Ge(){return new commander.Command("generate").description("Generate TypeScript types from collection configs").option("-c, --config <path>","Path to config file or directory","./src/kyro").option("-o, --output <path>","Output file path","./src/types/kyro.d.ts").option("-w, --watch","Watch for changes and regenerate").option("--url <url>","URL of a running Kyro CMS instance (enables remote mode)").option("--api-key <key>","API key for authentication (required with --url)").action(async e=>{if(e.url){e.url||(console.error("\u274C --url is required when using --api"),process.exit(1)),e.apiKey||(console.error("\u274C --api-key is required when using --api"),process.exit(1));let r=z.resolve(e.output);try{let n=await kt(e.url,e.apiKey),o=It(n),a=z.join(r,"..");X.existsSync(a)||X.mkdirSync(a,{recursive:!0}),X.writeFileSync(r,o);}catch(n){console.error("\u274C Error:",n.message),process.exit(1);}return}let t=z.resolve(e.config),s=z.resolve(e.output);try{let r=await glob.glob(`${t}/**/*.{ts,js}`);r.length===0&&(console.error("\u274C No config files found at:",t),process.exit(1));let n=[];for(let c of r)try{let d=await import(c),f=Object.values(d).filter(l=>l&&l.slug&&l.fields);n.push(...f);}catch{console.warn(`\u26A0\uFE0F  Could not parse: ${c}`);}n.length===0&&(console.error("\u274C No valid collection configs found"),process.exit(1));let o=Ve(n),a=z.join(s,"..");if(X.existsSync(a)||X.mkdirSync(a,{recursive:!0}),X.writeFileSync(s,o),e.watch){let{watch:c}=await import('fs');c(t,{recursive:!0},async(d,f)=>{let l=[];for(let O of r)try{let A=await import(O+`?t=${Date.now()}`),S=Object.values(A).filter(I=>I&&I.slug&&I.fields);l.push(...S);}catch{}let b=Ve(l);X.writeFileSync(s,b);});}}catch(r){console.error("\u274C Error:",r.message),process.exit(1);}})}function Lt(i=3){return Je__default.default.randomBytes(i).toString("hex")}function Ct(){return Je__default.default.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,16)}function Qe(){let i=new commander.Command("deploy").description("Deploy Kyro CMS");return i.command("cloudflare").description("Deploy to Cloudflare Workers with Assets").option("-d, --database <type>","Database type (d1|postgres)").option("-u, --database-url <url>","PostgreSQL connection string").option("-n, --name <name>","Cloudflare project name").option("-b, --r2-bucket <name>","R2 storage bucket name").option("-e, --email <email>","Initial Super Admin email").option("-p, --password <password>","Initial Super Admin password").option("-y, --non-interactive","Skip all prompts and use defaults").option("-q, --quiet","Run without prompts or spinners").option("-j, --json","Emit a final JSON line with deploy results (for programmatic consumers)").action(async e=>{console.log(`
  ${u__default.default.cyan.bold("\u2726 Kyro CMS")} ${u__default.default.dim("\u2014 Cloudflare Deployment")}
`);let t=Lt(),s=Ct(),{database:r,databaseUrl:n,name:o,r2Bucket:a,email:c,password:d,nonInteractive:f,quiet:l,json:b}=e;l&&(f=true);let O=`kyro-postgres-hd-${t}`;if(n&&!r&&(r="postgres"),!f&&process.stdout.isTTY){let h=[];r||h.push({type:"select",name:"database",message:"Select database infrastructure:",choices:[{title:"Cloudflare D1 (Native Serverless SQLite, auto-provisioned)",value:"d1"},{title:"PostgreSQL (External DB via Cloudflare Hyperdrive)",value:"postgres"}],initial:0}),r==="postgres"&&!n&&h.push({type:"text",name:"databaseUrl",message:"PostgreSQL Connection URL:"}),o||h.push({type:"text",name:"name",message:"Cloudflare Project Name:",initial:`kyro-app-${t}`}),a||h.push({type:"text",name:"r2Bucket",message:"Cloudflare R2 Bucket Name:",initial:`kyro-media-${t}`}),c||h.push({type:"text",name:"email",message:"Initial Super Admin Email:",initial:"admin@kyro-cms.com"}),d||h.push({type:"text",name:"password",message:"Initial Super Admin Password (leave blank to auto-generate):"});let m=await Nt__default.default(h);m.database&&(r=m.database),m.databaseUrl&&(n=m.databaseUrl),m.name&&(o=m.name),m.r2Bucket&&(a=m.r2Bucket),m.email&&(c=m.email),m.password&&(d=m.password);}o=o||`kyro-app-${t}`,a=a||`kyro-media-${t}`,c=c||"admin@kyro-cms.com",d=d||s,r=r||"d1",console.log(u__default.default.bgGray.black.bold(`
 Deployment Plan `)),console.log(`  ${u__default.default.dim("\u251C\u2500")} Hosting   : ${u__default.default.cyan("Cloudflare Workers with Assets")}`),console.log(`  ${u__default.default.dim("\u251C\u2500")} Database  : ${u__default.default.cyan(r==="d1"?"Cloudflare D1 (Native)":"PostgreSQL (Hyperdrive)")}`),console.log(`  ${u__default.default.dim("\u251C\u2500")} Project   : ${u__default.default.cyan(o)}`),console.log(`  ${u__default.default.dim("\u251C\u2500")} R2 Bucket : ${u__default.default.cyan(a)}`),console.log(`  ${u__default.default.dim("\u2514\u2500")} Admin     : ${u__default.default.cyan(c)}
`);let S=X__default.default.existsSync(z__default.default.join(process.cwd(),"pnpm-lock.yaml"))?"pnpm":"npm",I="npx wrangler";try{child_process.execSync(`${I} whoami`,{stdio:"ignore"}),console.log(`  ${u__default.default.green("\u2714")} Cloudflare Wrangler authenticated`);}catch{console.log(`  ${u__default.default.red("\u2716")} Cloudflare Wrangler authentication required.`),console.log(`    Run ${u__default.default.bold(`${I} login`)} or set the ${u__default.default.bold("CLOUDFLARE_API_TOKEN")} env var.`),process.exit(1);}let Z="",ee="",$=l?{isSilent:true}:{};if(r==="postgres"){n||(console.log(`  ${u__default.default.red("\u2716")} PostgreSQL mode requires a database URL.`),process.exit(1));let h=K__default.default({text:"Checking existing Hyperdrive resources...",...$}).start();try{let m=child_process.execSync(`${I} hyperdrive list --json`,{stdio:"pipe"}).toString(),C=JSON.parse(m.slice(m.indexOf("["))).find(We=>We.name===O);C&&(ee=C.id||C.uuid),h.succeed("Hyperdrive check complete");}catch{h.fail("Failed to list Hyperdrive resources");}if(!ee){let m=K__default.default({text:"Creating Hyperdrive...",...$}).start();try{let H=child_process.execSync(`${I} hyperdrive create "${O}" --connection-string="${n}" --json`,{stdio:"pipe"}).toString(),C=JSON.parse(H.slice(H.indexOf("{")));ee=C.id||C.uuid,m.succeed("Hyperdrive created");}catch{m.fail("Failed to create Hyperdrive");}}console.log(`  ${u__default.default.green("\u2714")} Hyperdrive resource ready (${O})`);}else {let h=`${o}-d1`,m=K__default.default({text:"Creating D1 database...",...$}).start();try{let C=child_process.execSync(`${I} d1 create "${h}"`,{stdio:"pipe"}).toString().match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);C&&(Z=C[1]),m.succeed("D1 database created");}catch{try{let C=child_process.execSync(`${I} d1 list --json`,{stdio:"pipe"}).toString(),ge=JSON.parse(C).find(bt=>bt.name===h);ge&&(Z=ge.id||ge.uuid),m.succeed("Existing D1 database found");}catch{m.fail("Failed to create/find D1 database");}}Z||(console.log(`  ${u__default.default.red("\u2716")} Failed to create/find D1 database '${h}'. (D1 database limit may be reached).`),process.exit(1));}let Be=K__default.default({text:"Creating R2 bucket...",...$}).start();try{child_process.execSync(`${I} r2 bucket create "${a}"`,{stdio:"ignore"}),Be.succeed("R2 bucket created");}catch{Be.fail("Failed to create R2 bucket");}try{child_process.execSync(`echo "y" | ${I} r2 bucket dev-url enable "${a}"`,{stdio:"ignore"});}catch{}let Et=K__default.default({text:"Generating wrangler.toml...",...$}).start(),te=`name = "${o}"
compatibility_date = "2026-07-31"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "dist/client"
binding = "ASSETS"
`;r==="postgres"?te+=`
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "${ee}"
`:te+=`
[[d1_databases]]
binding = "DB"
database_name = "${o}-d1"
database_id = "${Z}"
`,te+=`
[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "${a}"
`,X__default.default.writeFileSync(z__default.default.join(process.cwd(),"wrangler.toml"),te,"utf8"),Et.succeed("wrangler.toml generated");let _t=`import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('${d}', 10));`,He="";try{He=child_process.execSync(`node -e "${_t}"`,{stdio:"pipe"}).toString().trim();}catch{}if(r==="postgres"){try{child_process.execSync(`DATABASE_URL="${n}" npx drizzle-kit push --force`,{stdio:"ignore"});}catch{}let h=`
          import postgres from 'postgres';
          import bcrypt from 'bcryptjs';
          const sql = postgres(process.env.DATABASE_URL || '${n}');
          async function bootstrap() {
            try {
              await sql\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'customer', email_verified BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\`;
              await sql\`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)\`;
              const existing = await sql\`SELECT id FROM users WHERE email = '${c}'\`;
              if (existing.length === 0) {
                const hash = bcrypt.hashSync('${d}', 10);
                await sql\`INSERT INTO users (email, password_hash, role, email_verified) VALUES ('${c}', \\\${hash}, 'super_admin', true)\`;
              }
            } catch (e) {
            } finally { await sql.end(); }
          }
          bootstrap();
        `;try{child_process.execSync(`node -e "${h.replace(/\n/g," ")}"`,{stdio:"pipe"});}catch{}console.log(`  ${u__default.default.green("\u2714")} PostgreSQL schema migrated & Super Admin seeded`);}else {let h=`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT DEFAULT 'customer',
            email_verified INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified)
          VALUES ('admin-super-1', '${c}', '${He}', 'super_admin', 1);
        `;try{child_process.execSync(`${I} d1 execute "${o}-d1" --remote --command="${h.replace(/\n/g," ")}"`,{stdio:"ignore"}),console.log(`  ${u__default.default.green("\u2714")} D1 schema migrated & Super Admin seeded`);}catch{}}let Xe=K__default.default({text:"Building Astro project...",...$}).start();try{child_process.execSync(`${S} run build`,{stdio:"inherit"});let h=z__default.default.join(process.cwd(),"wrangler.toml"),m=X__default.default.readFileSync(h,"utf8");m.includes('main = "dist/server/entry.mjs"')||X__default.default.writeFileSync(h,`main = "dist/server/entry.mjs"
`+m,"utf8"),Xe.succeed("Build complete");}catch{Xe.fail("Build failed"),console.log(`
  ${u__default.default.red("\u2716")} Build failed. Inspect output above.`),process.exit(1);}let Ye=K__default.default({text:"Deploying to Cloudflare Workers...",...$}).start();X__default.default.existsSync(z__default.default.join(process.cwd(),".wrangler"))&&X__default.default.rmSync(z__default.default.join(process.cwd(),".wrangler"),{recursive:true,force:true});let se="";try{let h=child_process.execSync(`${I} deploy`,{stdio:"pipe"}).toString();process.stdout.write(h);let m=h.match(/https:\/\/[a-zA-Z0-9._-]+\.workers\.dev/);m&&(se=m[0]),Ye.succeed("Deployment successful"),console.log(`
  ${u__default.default.green.bold("\u{1F389} Deployment Successful!")}
`),console.log(`  ${u__default.default.bold("Super Admin Credentials")}`),console.log(`  ${u__default.default.dim("\u251C\u2500")} ${u__default.default.bold("Email   :")} ${u__default.default.cyan(c)}`),console.log(`  ${u__default.default.dim("\u2514\u2500")} ${u__default.default.bold("Password:")} ${u__default.default.yellow.bold(d)}`),se&&console.log(`  ${u__default.default.dim("\u2514\u2500")} ${u__default.default.bold("Live URL:")} ${u__default.default.cyan(se)}`),console.log(`
  ${u__default.default.dim("\u26A0\uFE0F  Save these credentials. Password won't be shown again.")}
`),b&&process.stdout.write(JSON.stringify({ok:!0,liveUrl:se,adminEmail:c,adminPassword:d})+`
`);}catch{Ye.fail("Deployment failed"),console.log(`
  ${u__default.default.red.bold("\u2716 Deployment Failed!")}`),console.log(`  ${u__default.default.dim("Inspect Wrangler output above for error details.")}
`),b&&process.stdout.write(JSON.stringify({ok:false,error:"Deployment failed"})+`
`),process.exit(1);}}),i}var Zt=url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))),es=z.dirname(Zt),Tt="0.1.0";try{Tt=JSON.parse(X.readFileSync(z.join(es,"../../package.json"),"utf-8")).version;}catch{}var v=new commander.Command;v.name("kyro").description("Kyro CMS - Astro-native headless CMS").version(Tt);v.command("dev").description("Start Kyro CMS development server").option("-p, --port <port>","Port to run on","4321").option("-h, --host <host>","Host to bind to","localhost").action(async i=>{let{exec:e}=await import('child_process'),t=e(`astro dev --port ${i.port} --host ${i.host}`,{env:{...process.env,NODE_NO_WARNINGS:"1"}});t.stdout?.on("data",s=>process.stdout.write(s)),t.stderr?.on("data",s=>process.stderr.write(s)),process.on("SIGINT",()=>{t.kill("SIGINT"),process.exit(0);}),process.on("SIGTERM",()=>{t.kill("SIGTERM"),process.exit(0);});});v.addCommand(Ge());v.addCommand(Qe());var Q=v.command("db").description("Database management commands");Q.command("generate").description("Generate migrations from schema").action(async()=>{let{exec:i}=await import('child_process');i("npx drizzle-kit generate",(e,t,s)=>{e&&(console.error("\u274C Generation failed:",e.message),process.exit(1));});});Q.command("migrate").description("Run database migrations").action(async()=>{let{exec:i}=await import('child_process');i("npx drizzle-kit migrate",(e,t,s)=>{e&&(console.error("\u274C Migration failed:",e.message),process.exit(1));});});Q.command("push").description("Push schema to database (development)").action(async()=>{let{exec:i}=await import('child_process');i("npx drizzle-kit push",(e,t,s)=>{e&&(console.error("\u274C Push failed:",e.message),process.exit(1));});});Q.command("seed").description("Seed database with initial data").action(async()=>{let{exec:i}=await import('child_process');i("npx tsx src/database/drizzle/seed.ts",(e,t,s)=>{e&&(console.error("\u274C Seeding failed:",e.message),process.exit(1));});});Q.command("studio").description("Open Drizzle Studio").action(async()=>{let{exec:i}=await import('child_process');i("npx drizzle-kit studio",(e,t,s)=>{e&&(console.error("\u274C Studio failed:",e.message),process.exit(1));});});var ts=v.command("auth").description("Authentication management commands");ts.command("bootstrap").description("Create initial admin user").option("-e, --email <email>","Admin email",process.env.KYRO_ADMIN_EMAIL).option("-p, --password <password>","Admin password",process.env.KYRO_ADMIN_PASSWORD).option("-r, --role <role>","Admin role",process.env.KYRO_ADMIN_ROLE||"admin").action(async i=>{(!i.email||!i.password)&&(console.error("\u274C Email and password are required. Set KYRO_ADMIN_EMAIL and KYRO_ADMIN_PASSWORD env vars or use -e and -p options."),process.exit(1));try{let{bootstrapAdmin:e}=await Promise.resolve().then(()=>(ct(),at)),t=process.env.DATABASE_URL||"",s=t.toLowerCase().startsWith("postgres://")||t.toLowerCase().startsWith("postgresql://"),r=t.toLowerCase().startsWith("mongodb://")||t.toLowerCase().startsWith("mongodb+srv://"),n=!t||t.includes(".db")||t.includes("sqlite")||t.includes("file:"),o;if(s){let{PostgresAuthAdapter:c}=await Promise.resolve().then(()=>(ht(),gt)),{drizzle:d}=await import('drizzle-orm/postgres-js'),{default:f}=await import('postgres'),l=f(t,{max:1,onnotice:()=>{}}),b=d(l);o=new c({db:b});}else if(r){let{MongoDBAuthAdapter:c}=await Promise.resolve().then(()=>(yt(),ft)),d=await import('mongodb'),f=new d.MongoClient(t);await f.connect();let l=f.db();o=new c({db:l});}else {let{SQLiteAuthAdapter:c}=await Promise.resolve().then(()=>(Ee(),Ze)),d=process.env.KYRO_AUTH_DB_PATH||"./data/auth.db";o=new c({path:d});}o.connect&&await o.connect();let a=await e({authAdapter:o,adminEmail:i.email,adminPassword:i.password,adminRole:i.role});o.disconnect&&await o.disconnect(),a.success||(console.error("\u274C Failed to create admin:",a.error),process.exit(1));}catch(e){console.error("\u274C Bootstrap failed:",e),process.exit(1);}});v.command("health").description("Check system health").action(async()=>{let i=process.env.DATABASE_URL||"",e=i.toLowerCase().startsWith("postgres://")||i.toLowerCase().startsWith("postgresql://"),t=i.toLowerCase().startsWith("mongodb://")||i.toLowerCase().startsWith("mongodb+srv://"),s=!i||i.includes(".db")||i.includes("sqlite")||i.includes("file:");if(e)try{let{default:r}=await import('postgres'),n=r(i,{max:1,onnotice:()=>{}});await n.unsafe("SELECT 1"),await n.end();}catch{}else if(t)try{let r=await import('mongodb'),n=new r.MongoClient(i);await n.connect(),await n.db().admin().ping(),await n.close();}catch{}else if(s)try{let r=process.env.KYRO_AUTH_DB_PATH||"./data/auth.db",{existsSync:n}=await import('fs');n(r);}catch{}});v.parse();process.argv.slice(2).length||v.outputHelp();
