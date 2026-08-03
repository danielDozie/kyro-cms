import E from'bcryptjs';import {randomBytes}from'crypto';import {mkdirSync}from'fs';import {dirname}from'path';import {createRequire}from'module';var c;function m(){return c||(c=createRequire("file:///")("node:sqlite").DatabaseSync,c)}var g=5e3,S=1e3,k=-64e3,A=268435456,l=class{db=null;path;saltRounds;externalDb;busyTimeout;walAutoCheckpoint;cacheSize;mmapSize;preparedStatements=new Map;constructor(e={}){this.path=e.path||"./data/auth.db",this.saltRounds=e.saltRounds||12,this.externalDb=!!e.db,this.busyTimeout=e.busyTimeout??g,this.walAutoCheckpoint=e.walAutoCheckpoint??S,this.cacheSize=e.cacheSize??k,this.mmapSize=e.mmapSize??A,e.db&&(this.db=e.db);}async connect(){if(this.db)return;let e=dirname(this.path);e&&e!=="."&&mkdirSync(e,{recursive:true}),this.db=new(m())(this.path),this.db.exec(`PRAGMA busy_timeout = ${this.busyTimeout}`),this.db.exec("PRAGMA journal_mode = WAL"),this.db.exec("PRAGMA synchronous = NORMAL"),this.db.exec("PRAGMA cache_size = "+this.cacheSize),this.db.exec("PRAGMA mmap_size = "+this.mmapSize),this.db.exec("PRAGMA wal_autocheckpoint = "+this.walAutoCheckpoint),this.db.exec("PRAGMA foreign_keys = ON"),this.db.exec("PRAGMA temp_store = MEMORY"),this.ensureTables(),this.prepareStatements();}async disconnect(){this.db&&!this.externalDb&&(this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)"),this.db.close(),this.db=null,this.preparedStatements.clear());}async ensureConnected(){if(this.db||await this.connect(),!this.db)throw new Error("Failed to connect to SQLite database");return this.db}ensureTables(){if(this.db){this.db.exec(`
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
      `)),this.preparedStatements.set("resetLockout",this.db.prepare("UPDATE kyro_lockouts SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE user_id = ?")));}stmt(e){let s=this.preparedStatements.get(e);if(!s)throw new Error(`Prepared statement not found: ${e}`);return s}async cleanupExpiredSessions(){return await this.ensureConnected(),this.stmt("deleteExpiredSessions").run(new Date().toISOString()).changes}async cleanupOldAuditLogs(e=30){await this.ensureConnected();let s=new Date(Date.now()-e*24*60*60*1e3).toISOString();return this.stmt("cleanupOldAuditLogs").run(s).changes}async getStats(){await this.ensureConnected();let e=this.stmt("countUsers").get().count,s=this.db.prepare("SELECT COUNT(*) as count FROM kyro_sessions WHERE expires_at > ?").get(new Date().toISOString()).count,t=this.db.prepare("SELECT COUNT(*) as count FROM kyro_audit_logs").get().count;return {userCount:e,activeSessionCount:s,auditLogCount:t}}async createUser(e){await this.ensureConnected();let s=randomBytes(16).toString("hex"),t=new Date().toISOString(),r=await this.hashPassword(e.password),n={id:s,name:e.name,email:e.email.toLowerCase(),passwordHash:r,role:e.role||"customer",avatar:e.avatar,tenantId:e.tenantId,createdAt:t,updatedAt:t};return this.db.prepare(`INSERT INTO kyro_users (id, name, email, password_hash, role, avatar, tenant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s,n.name||null,n.email,n.passwordHash,n.role,n.avatar||null,n.tenantId||null,t,t),n}async findUserByEmail(e){await this.ensureConnected();let s=this.stmt("findUserByEmail").get(e.toLowerCase());return s?this.rowToUser(s):null}async findUserById(e){await this.ensureConnected();let s=this.stmt("findUserById").get(e);return s?this.rowToUser(s):null}async updateUser(e,s){if(await this.ensureConnected(),!await this.findUserById(e))return null;let r=[],n=[];return s.email!==void 0&&(r.push("email = ?"),n.push(s.email.toLowerCase())),s.name!==void 0&&(r.push("name = ?"),n.push(s.name)),s.passwordHash!==void 0&&(r.push("password_hash = ?"),n.push(s.passwordHash)),s.role!==void 0&&(r.push("role = ?"),n.push(s.role)),s.avatar!==void 0&&(r.push("avatar = ?"),n.push(s.avatar)),s.tenantId!==void 0&&(r.push("tenant_id = ?"),n.push(s.tenantId)),s.emailVerified!==void 0&&(r.push("email_verified = ?"),n.push(s.emailVerified?1:0)),s.locked!==void 0&&(r.push("locked = ?"),n.push(s.locked?1:0)),s.lastLogin!==void 0&&(r.push("last_login = ?"),n.push(s.lastLogin)),s.failedLoginAttempts!==void 0&&(r.push("failed_login_attempts = ?"),n.push(s.failedLoginAttempts)),r.push("updated_at = ?"),n.push(new Date().toISOString()),n.push(e),this.db.prepare(`UPDATE kyro_users SET ${r.join(", ")} WHERE id = ?`).run(...n),this.findUserById(e)}async deleteUser(e){return await this.ensureConnected(),this.stmt("deleteUser").run(e).changes>0}async hashPassword(e){return E.hash(e,this.saltRounds)}async verifyPassword(e,s){await this.ensureConnected();let t=await this.findUserByEmail(e);if(!t)return null;let r=this.db.prepare("SELECT password_hash FROM kyro_users WHERE id = ?").get(t.id);return r?.password_hash&&await E.compare(s,r.password_hash)?t:null}async createSession(e,s={}){await this.ensureConnected();let t=randomBytes(32).toString("hex"),r=randomBytes(32).toString("base64url"),n=randomBytes(32).toString("base64url"),d=new Date,u=new Date(d.getTime()+864e5).toISOString(),i={id:t,userId:e,token:r,refreshToken:n,expiresAt:u,createdAt:d.toISOString(),ipAddress:s.ipAddress,userAgent:s.userAgent};return this.db.prepare(`INSERT INTO kyro_sessions (id, user_id, token, refresh_token, expires_at, created_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(i.id,i.userId,i.token,i.refreshToken??null,i.expiresAt,i.createdAt,i.ipAddress??null,i.userAgent??null),i}async findSessionByToken(e){await this.ensureConnected();let s=this.stmt("findSessionByToken").get(e);return s?this.rowToSession(s):null}async findSessionByRefreshToken(e){await this.ensureConnected();let s=this.stmt("findSessionByRefreshToken").get(e);return s?this.rowToSession(s):null}async deleteSession(e){return await this.ensureConnected(),this.stmt("deleteSession").run(e,e).changes>0}async deleteUserSessions(e){return await this.ensureConnected(),this.stmt("deleteUserSessions").run(e).changes}async hasAnyUsers(){return await this.ensureConnected(),this.stmt("countUsers").get().count>0}async findUsers(e={}){await this.ensureConnected();let s=e.page??1,t=e.limit??10,r=(s-1)*t,n=e.search,d,u;if(n){let i=`%${n}%`;d=this.stmt("countUsersWithSearch").get(i).count,u=this.stmt("findUsersWithSearch").all(i,t,r);}else d=this.stmt("countUsers").get().count,u=this.stmt("findUsersPaginated").all(t,r);return {users:u.map(i=>this.rowToUser(i)),total:d}}async addPasswordToHistory(e,s){await this.ensureConnected(),this.stmt("addPasswordHistory").run(e,s,new Date().toISOString()),this.stmt("trimPasswordHistory").run(e);}async getPasswordHistory(e,s=5){return await this.ensureConnected(),this.stmt("getPasswordHistory").all(e,s).map(r=>r.password_hash)}async isPasswordInHistory(e,s,t=5){let r=await this.getPasswordHistory(s,t);for(let n of r)if(await E.compare(e,n))return  true;return  false}async recordFailedAttempt(e){await this.ensureConnected();let s=Date.now(),t=this.stmt("getLockout").get(e),r=(t?.attempts||0)+1,n=r>=5?s+900*1e3:t?.locked_until||null;this.stmt("upsertLockout").run(e,r,s,n!==null?s:null,n);}async resetAttempts(e){await this.ensureConnected(),this.stmt("resetLockout").run(e);}async checkLockout(e){await this.ensureConnected(),this.stmt("cleanupExpiredLockouts").run(Date.now());let s=this.stmt("getLockout").get(e);return s?s.locked_until!==null&&s.locked_until>Date.now()?{locked:true,attemptsRemaining:0,lockedUntil:new Date(s.locked_until),totalAttempts:s.attempts}:{locked:false,attemptsRemaining:Math.max(0,5-s.attempts),totalAttempts:s.attempts}:{locked:false,attemptsRemaining:5,totalAttempts:0}}async logAudit(e){await this.ensureConnected();let s=randomBytes(16).toString("hex"),t=new Date().toISOString();return this.db.prepare(`INSERT INTO kyro_audit_logs (
          id, timestamp, action, user_id, user_email, role, resource, resource_id,
          ip_address, user_agent, success, error, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s,t,e.action,e.userId||null,e.userEmail||null,e.role||null,e.resource,e.resourceId||null,e.ipAddress||null,e.userAgent||null,e.success?1:0,e.error||null,e.metadata?JSON.stringify(e.metadata):null,new Date().toISOString()),s}async queryAuditLogs(e={}){await this.ensureConnected();let s=[],t=[];e.action&&(s.push("action = ?"),t.push(e.action)),e.userId&&(s.push("user_id = ?"),t.push(e.userId)),e.resource&&(s.push("resource = ?"),t.push(e.resource)),e.success!==void 0&&(s.push("success = ?"),t.push(e.success?1:0)),e.startDate&&(s.push("timestamp >= ?"),t.push(e.startDate.toISOString())),e.endDate&&(s.push("timestamp <= ?"),t.push(e.endDate.toISOString()));let r=s.length>0?"WHERE "+s.join(" AND "):"",n=e.limit||50,d=e.offset||0,u=this.db.prepare(`SELECT COUNT(*) as count FROM kyro_audit_logs ${r}`).get(...t),i=this.db.prepare(`SELECT * FROM kyro_audit_logs ${r} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...t,n,d);return {total:u.count,logs:i.map(a=>({id:a.id,timestamp:new Date(a.timestamp),action:a.action,userId:a.user_id||void 0,userEmail:a.user_email||void 0,resource:a.resource,resourceId:a.resource_id||void 0,ipAddress:a.ip_address||void 0,userAgent:a.user_agent||void 0,success:a.success===1,error:a.error||void 0,metadata:a.metadata?JSON.parse(a.metadata):void 0}))}}rowToUser(e){return {id:e.id,name:e.name||void 0,email:e.email,passwordHash:e.password_hash,role:e.role,tenantId:e.tenant_id,avatar:e.avatar,emailVerified:e.email_verified===1,locked:e.locked===1,lastLogin:e.last_login,failedLoginAttempts:e.failed_login_attempts||0,createdAt:e.created_at,updatedAt:e.updated_at}}rowToSession(e){return {id:e.id,userId:e.user_id,token:e.token,refreshToken:e.refresh_token,expiresAt:e.expires_at,createdAt:e.created_at,ipAddress:e.ip_address,userAgent:e.user_agent}}async findAuditLogs(e){let s=await this.queryAuditLogs({action:e.action,userId:e.userId,resource:e.resource,success:e.success,startDate:e.startDate,endDate:e.endDate,limit:e.limit,offset:e.offset});return {logs:s.logs.map(t=>({...t,action:t.action})),total:s.total}}async createAuditLog(e){let s=await this.logAudit({action:e.action,userId:e.userId,userEmail:e.userEmail,role:e.role,resource:e.resource,resourceId:e.resourceId,ipAddress:e.ipAddress,userAgent:e.userAgent,success:e.success,error:e.error,metadata:e.metadata}),t=this.db?.prepare("SELECT * FROM kyro_audit_logs WHERE id = ?").get(s);return {...e,id:s,timestamp:t?new Date(t.timestamp):new Date}}async createEmailVerificationToken(e){await this.ensureConnected();let s=randomBytes(16).toString("hex"),t=randomBytes(32).toString("hex"),r=new Date(Date.now()+1440*60*1e3);return this.db.prepare("INSERT INTO kyro_email_verifications (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(s,e,t,r.toISOString(),new Date().toISOString()),{token:t,expiresAt:r}}async verifyEmailToken(e){await this.ensureConnected();let s=this.db.prepare("SELECT * FROM kyro_email_verifications WHERE token = ?").get(e);return s?new Date(s.expires_at)<new Date?{success:false,error:"Verification token has expired"}:(this.db.prepare("UPDATE kyro_users SET email_verified = 1 WHERE id = ?").run(s.user_id),this.db.prepare("DELETE FROM kyro_email_verifications WHERE id = ?").run(s.id),{success:true,userId:s.user_id}):{success:false,error:"Invalid verification token"}}async createPasswordResetToken(e){await this.ensureConnected();let s=await this.findUserByEmail(e);if(!s)return {token:"",expiresAt:new Date,error:"User not found"};let t=randomBytes(16).toString("hex"),r=randomBytes(32).toString("hex"),n=new Date(Date.now()+3600*1e3);return this.db.prepare("INSERT INTO kyro_password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(t,s.id,r,n.toISOString(),new Date().toISOString()),{token:r,expiresAt:n}}async resetPasswordWithToken(e,s){await this.ensureConnected();let t=this.db.prepare("SELECT * FROM kyro_password_resets WHERE token = ?").get(e);if(!t)return {success:false,error:"Invalid reset token"};if(new Date(t.expires_at)<new Date)return {success:false,error:"Reset token has expired"};if(t.used_at)return {success:false,error:"Reset token has already been used"};let r=await this.hashPassword(s);return this.db.prepare("UPDATE kyro_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(r,new Date().toISOString(),t.user_id),this.db.prepare("UPDATE kyro_password_resets SET used_at = ? WHERE id = ?").run(new Date().toISOString(),t.id),this.db.prepare("DELETE FROM kyro_sessions WHERE user_id = ?").run(t.user_id),{success:true}}};export{l as a};