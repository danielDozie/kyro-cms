export interface PresenceUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color?: string;
  lastSeen: number;
}

export interface CursorState {
  userId: string;
  field?: string;
  position?: number;
  selection?: { start: number; end: number };
  updatedAt: number;
}

export interface FieldLock {
  fieldName: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

export interface DocComment {
  id: string;
  authorId: string;
  authorName: string;
  field?: string;
  text: string;
  createdAt: string;
  resolved?: boolean;
}

export interface DocPresenceState {
  docKey: string; // e.g. "posts:123"
  users: Map<string, PresenceUser>;
  cursors: Map<string, CursorState>;
  locks: Map<string, FieldLock>;
  comments: DocComment[];
}

export class PresenceManager {
  private documents = new Map<string, DocPresenceState>();
  private defaultLockTtlMs = 30_000; // 30 seconds default lock expiration

  private getOrCreateDoc(docKey: string): DocPresenceState {
    let doc = this.documents.get(docKey);
    if (!doc) {
      doc = {
        docKey,
        users: new Map(),
        cursors: new Map(),
        locks: new Map(),
        comments: [],
      };
      this.documents.set(docKey, doc);
    }
    return doc;
  }

  /**
   * User joins a document room
   */
  public join(docKey: string, user: Omit<PresenceUser, 'lastSeen'>): PresenceUser[] {
    const doc = this.getOrCreateDoc(docKey);
    const presenceUser: PresenceUser = {
      ...user,
      color: user.color || this.generateUserColor(user.id),
      lastSeen: Date.now(),
    };
    doc.users.set(user.id, presenceUser);
    return Array.from(doc.users.values());
  }

  /**
   * User leaves a document room
   */
  public leave(docKey: string, userId: string): { remainingUsers: PresenceUser[]; releasedLocks: string[] } {
    const doc = this.documents.get(docKey);
    if (!doc) return { remainingUsers: [], releasedLocks: [] };

    doc.users.delete(userId);
    doc.cursors.delete(userId);

    // Release all locks held by this user
    const releasedLocks: string[] = [];
    for (const [field, lock] of doc.locks.entries()) {
      if (lock.userId === userId) {
        doc.locks.delete(field);
        releasedLocks.push(field);
      }
    }

    if (doc.users.size === 0 && doc.locks.size === 0 && doc.comments.length === 0) {
      this.documents.delete(docKey);
    }

    return {
      remainingUsers: Array.from(doc.users.values()),
      releasedLocks,
    };
  }

  /**
   * Updates user cursor / focused field in real time
   */
  public updateCursor(
    docKey: string,
    userId: string,
    cursor: { field?: string; position?: number; selection?: { start: number; end: number } }
  ): CursorState {
    const doc = this.getOrCreateDoc(docKey);
    const user = doc.users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
    }

    const state: CursorState = {
      userId,
      field: cursor.field,
      position: cursor.position,
      selection: cursor.selection,
      updatedAt: Date.now(),
    };
    doc.cursors.set(userId, state);
    return state;
  }

  /**
   * Attempts to acquire an exclusive lock on a field
   */
  public acquireLock(
    docKey: string,
    fieldName: string,
    user: { id: string; name: string },
    ttlMs = this.defaultLockTtlMs
  ): { success: boolean; lock?: FieldLock; currentLock?: FieldLock } {
    const doc = this.getOrCreateDoc(docKey);
    const now = Date.now();

    // Check if field is already locked
    const existingLock = doc.locks.get(fieldName);
    if (existingLock && existingLock.expiresAt > now && existingLock.userId !== user.id) {
      return { success: false, currentLock: existingLock };
    }

    const lock: FieldLock = {
      fieldName,
      userId: user.id,
      userName: user.name,
      lockedAt: now,
      expiresAt: now + ttlMs,
    };

    doc.locks.set(fieldName, lock);
    return { success: true, lock };
  }

  /**
   * Releases an exclusive lock on a field
   */
  public releaseLock(docKey: string, fieldName: string, userId: string): boolean {
    const doc = this.documents.get(docKey);
    if (!doc) return false;

    const lock = doc.locks.get(fieldName);
    if (lock && (lock.userId === userId || lock.expiresAt <= Date.now())) {
      doc.locks.delete(fieldName);
      return true;
    }

    return false;
  }

  /**
   * Adds an editorial review comment
   */
  public addComment(
    docKey: string,
    comment: { id: string; authorId: string; authorName: string; field?: string; text: string }
  ): DocComment {
    const doc = this.getOrCreateDoc(docKey);
    const newComment: DocComment = {
      ...comment,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    doc.comments.push(newComment);
    return newComment;
  }

  /**
   * Resolves an editorial comment
   */
  public resolveComment(docKey: string, commentId: string): boolean {
    const doc = this.documents.get(docKey);
    if (!doc) return false;

    const target = doc.comments.find((c) => c.id === commentId);
    if (target) {
      target.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Returns snapshot of entire presence state for a document
   */
  public getSnapshot(docKey: string): {
    users: PresenceUser[];
    cursors: CursorState[];
    locks: FieldLock[];
    comments: DocComment[];
  } {
    const doc = this.documents.get(docKey);
    if (!doc) {
      return { users: [], cursors: [], locks: [], comments: [] };
    }

    const now = Date.now();
    // Prune expired locks
    for (const [field, lock] of doc.locks.entries()) {
      if (lock.expiresAt <= now) {
        doc.locks.delete(field);
      }
    }

    return {
      users: Array.from(doc.users.values()),
      cursors: Array.from(doc.cursors.values()),
      locks: Array.from(doc.locks.values()),
      comments: doc.comments,
    };
  }

  /**
   * Deterministic avatar color generator for users
   */
  private generateUserColor(id: string): string {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
