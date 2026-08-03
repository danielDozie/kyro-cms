import {a,d,j,k,e,h,i}from'./chunk-OG7CNQGU.js';import {sql,eq,desc,and,gt}from'drizzle-orm';import O from'bcryptjs';import {randomBytes}from'crypto';var D=false,S=class{db;prefix;sessionTTL;refreshTokenTTL;constructor(e){this.db=e.db,this.prefix=e.prefix||"kyro:",this.sessionTTL=e.sessionTTL||86400,this.refreshTokenTTL=e.refreshTokenTTL||604800;}async connect(){D||(await this.db.execute(sql`
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
    `),await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" VARCHAR(255)`),await this.db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" ("tenant_id")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role")`),await this.db.execute(sql`
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
    `),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" ("expires_at")`),await this.db.execute(sql`
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
    `),await this.db.execute(sql`ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" TYPE VARCHAR(255)`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp")`),await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "password_history_user_idx" ON "password_history" ("user_id")`),await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "lockouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ip_address" VARCHAR(45),
        "reason" VARCHAR(255),
        "locked_until" TIMESTAMP NOT NULL,
        "released_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "lockouts_user_idx" ON "lockouts" ("user_id")`),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "lockouts_locked_until_idx" ON "lockouts" ("locked_until")`),await this.db.execute(sql`
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
    `),await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "roles_level_idx" ON "roles" ("level")`),await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "settings" JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(sql`
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
    `),await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),D=true);}async disconnect(){}async createUser(e){let s=await this.hashPassword(e.password),[t]=await this.db.insert(a).values({email:e.email.toLowerCase(),name:e.name,passwordHash:s,role:e.role||"customer",avatar:e.avatar,tenantId:e.tenantId}).returning();return this.userToAuthUser(t)}async findUserByEmail(e){let[s]=await this.db.select().from(a).where(eq(a.email,e.toLowerCase())).limit(1);return s?this.userToAuthUser(s):null}async findUserById(e){let[s]=await this.db.select().from(a).where(eq(a.id,e)).limit(1);return s?this.userToAuthUser(s):null}async updateUser(e,s){let t={updatedAt:new Date};s.name!==void 0&&(t.name=s.name),s.email!==void 0&&(t.email=s.email),s.passwordHash!==void 0&&(t.passwordHash=s.passwordHash),s.role!==void 0&&(t.role=s.role),s.tenantId!==void 0&&(t.tenantId=s.tenantId),s.avatar!==void 0&&(t.avatar=s.avatar),s.emailVerified!==void 0&&(t.emailVerified=s.emailVerified),s.locked!==void 0&&(t.locked=s.locked),s.lastLogin!==void 0&&(t.lastLogin=s.lastLogin?new Date(s.lastLogin):null),s.failedLoginAttempts!==void 0&&(t.failedLoginAttempts=s.failedLoginAttempts);let[r]=await this.db.update(a).set(t).where(eq(a.id,e)).returning();return r?this.userToAuthUser(r):null}async deleteUser(e){return await this.db.delete(a).where(eq(a.id,e)),true}async findUsers(e={}){let s=e.page??1,t=e.limit??10,r=(s-1)*t,u=e.search;if(u){let m=`%${u}%`,[U,[{count:f}]]=await Promise.all([this.db.select().from(a).where(sql`${a.email} ILIKE ${m}`).orderBy(desc(a.createdAt)).limit(t).offset(r),this.db.select({count:sql`count(*)`}).from(a).where(sql`${a.email} ILIKE ${m}`)]);return {users:U.map(c=>this.userToAuthUser(c)),total:Number(f)}}let[l,[{count:E}]]=await Promise.all([this.db.select().from(a).orderBy(desc(a.createdAt)).limit(t).offset(r),this.db.select({count:sql`count(*)`}).from(a)]);return {users:l.map(m=>this.userToAuthUser(m)),total:Number(E)}}async verifyPassword(e,s){let t=await this.findUserByEmail(e);if(!t)return null;let[r]=await this.db.select().from(a).where(eq(a.email,e.toLowerCase())).limit(1);return r?.passwordHash&&await O.compare(s,r.passwordHash)?t:null}async hashPassword(e){return O.hash(e,12)}async createSession(e,s){let t=randomBytes(32).toString("base64url"),r=randomBytes(32).toString("base64url"),u=new Date(Date.now()+this.sessionTTL*1e3);new Date(Date.now()+this.refreshTokenTTL*1e3);let [E]=await this.db.insert(d).values({userId:e,token:t,refreshToken:r,ipAddress:s?.ipAddress,userAgent:s?.userAgent,expiresAt:u}).returning();return this.sessionToSession(E)}async findSessionByToken(e){let[s]=await this.db.select().from(d).where(and(eq(d.token,e),gt(d.expiresAt,new Date))).limit(1);return s?this.sessionToSession(s):null}async findSessionByRefreshToken(e){let[s]=await this.db.select().from(d).where(and(eq(d.refreshToken,e),gt(d.expiresAt,new Date))).limit(1);return s?this.sessionToSession(s):null}async deleteSession(e){return await this.db.delete(d).where(eq(d.id,e)),true}async deleteUserSessions(e){return await this.db.delete(d).where(eq(d.userId,e)),1}async addPasswordToHistory(e,s){await this.db.insert(j).values({userId:e,passwordHash:s});}async getPasswordHistory(e,s=5){return (await this.db.select({passwordHash:j.passwordHash}).from(j).where(eq(j.userId,e)).orderBy(desc(j.createdAt)).limit(s)).map(r=>r.passwordHash)}async isPasswordInHistory(e,s,t=5){let r=await this.getPasswordHistory(s,t);for(let u of r)if(await this.verifyPassword(e,u))return  true;return  false}async isLocked(e){let[s]=await this.db.select().from(k).where(and(eq(k.userId,e),gt(k.lockedUntil,new Date))).limit(1);return !!s}async getLockout(e){let[s]=await this.db.select().from(k).where(and(eq(k.userId,e),gt(k.lockedUntil,new Date))).limit(1);return s?{lockedUntil:s.lockedUntil}:null}async recordFailedAttempt(e,s){let r=((await this.findUserById(e))?.failedLoginAttempts||0)+1;await this.updateUser(e,{failedLoginAttempts:r});let l=r>=5;return l&&await this.db.insert(k).values({userId:e,ipAddress:s,reason:"Too many failed login attempts",lockedUntil:new Date(Date.now()+9e5)}),{attempts:r,locked:l}}async resetAttempts(e){await this.updateUser(e,{failedLoginAttempts:0});}async findAuditLogs(e$1){let{limit:s=50,offset:t=0,userId:r,action:u,resource:l,resourceId:E,success:m,startDate:U,endDate:f}=e$1,c=[];r&&c.push(eq(e.userId,r)),u&&(Array.isArray(u)?c.push(sql`${e.action} = ANY(${u})`):c.push(eq(e.action,u))),l&&c.push(eq(e.resource,l)),E&&c.push(eq(e.resourceId,E)),m!==void 0&&c.push(eq(e.success,m)),U&&c.push(sql`${e.timestamp} >= ${U}`),f&&c.push(sql`${e.timestamp} <= ${f}`);let R=c.length>0?and(...c):void 0,_=await this.db.select({count:sql`count(*)`}).from(e).where(R);return {logs:(await this.db.select().from(e).where(R).orderBy(desc(e.timestamp)).limit(s).offset(t)).map(o=>({id:o.id,timestamp:o.timestamp,action:o.action,userId:o.userId||void 0,userEmail:o.userEmail||void 0,role:o.role||void 0,resource:o.resource,resourceId:o.resourceId||void 0,changes:o.changes||void 0,ipAddress:o.ipAddress||void 0,userAgent:o.userAgent||void 0,success:o.success,error:o.error||void 0,metadata:o.metadata||void 0})),total:Number(_[0]?.count||0)}}async createAuditLog(e$1){let s=crypto.randomUUID(),t=new Date;return await this.db.insert(e).values({id:s,action:e$1.action,userId:e$1.userId??null,userEmail:e$1.userEmail??null,role:e$1.role??null,resource:e$1.resource,resourceId:e$1.resourceId??null,changes:e$1.changes??null,ipAddress:e$1.ipAddress??null,userAgent:e$1.userAgent??null,success:e$1.success,error:e$1.error??null,metadata:e$1.metadata??null,timestamp:t}),{...e$1,id:s,timestamp:t}}userToAuthUser(e){return {id:e.id,name:e.name||void 0,email:e.email,passwordHash:e.passwordHash||void 0,role:e.role,avatar:e.avatar&&typeof e.avatar=="object"?e.avatar.id||void 0:e.avatar||void 0,tenantId:e.tenantId||void 0,emailVerified:e.emailVerified||false,locked:e.locked||false,lastLogin:e.lastLogin?new Date(e.lastLogin).toISOString():void 0,failedLoginAttempts:e.failedLoginAttempts||0,createdAt:new Date(e.createdAt).toISOString(),updatedAt:new Date(e.updatedAt).toISOString()}}sessionToSession(e){return {id:e.id,userId:e.userId,token:e.token,refreshToken:e.refreshToken||void 0,expiresAt:new Date(e.expiresAt).toISOString(),createdAt:new Date(e.createdAt).toISOString(),ipAddress:e.ipAddress||void 0,userAgent:e.userAgent||void 0}}async createEmailVerificationToken(e){let s=randomBytes(32).toString("hex"),t=new Date(Date.now()+1440*60*1e3);return await this.db.insert(h).values({userId:e,token:s,expiresAt:t}),{token:s,expiresAt:t}}async verifyEmailToken(e){let[s]=await this.db.select().from(h).where(eq(h.token,e)).limit(1);return s?s.expiresAt<new Date?{success:false,error:"Verification token has expired"}:(await this.db.update(a).set({emailVerified:true}).where(eq(a.id,s.userId)),await this.db.delete(h).where(eq(h.id,s.id)),{success:true,userId:s.userId}):{success:false,error:"Invalid verification token"}}async createPasswordResetToken(e){let s=await this.findUserByEmail(e);if(!s)return {token:"",expiresAt:new Date,error:"User not found"};let t=randomBytes(32).toString("hex"),r=new Date(Date.now()+3600*1e3);return await this.db.insert(i).values({userId:s.id,token:t,expiresAt:r}),{token:t,expiresAt:r}}async resetPasswordWithToken(e,s){let[t]=await this.db.select().from(i).where(eq(i.token,e)).limit(1);if(!t)return {success:false,error:"Invalid reset token"};if(t.expiresAt<new Date)return {success:false,error:"Reset token has expired"};if(t.usedAt)return {success:false,error:"Reset token has already been used"};let r=await this.hashPassword(s);return await this.db.update(a).set({passwordHash:r,updatedAt:new Date}).where(eq(a.id,t.userId)),await this.db.update(i).set({usedAt:new Date}).where(eq(i.id,t.id)),await this.db.delete(d).where(eq(d.userId,t.userId)),{success:true}}};export{S as a};