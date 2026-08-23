import { describe, it, expect } from 'vitest';
import { PresenceManager } from '../src/api/ws/presence.js';

describe('PresenceManager & Real-Time Multiplayer Collaboration', () => {
  it('should track user join and leave across document rooms', () => {
    const manager = new PresenceManager();
    const docKey = 'posts:post_123';

    // User A joins
    const users1 = manager.join(docKey, { id: 'user_a', name: 'Alice', email: 'alice@example.com' });
    expect(users1).toHaveLength(1);
    expect(users1[0].name).toBe('Alice');
    expect(users1[0].color).toBeDefined();

    // User B joins
    const users2 = manager.join(docKey, { id: 'user_b', name: 'Bob', email: 'bob@example.com' });
    expect(users2).toHaveLength(2);

    // User A leaves
    const { remainingUsers } = manager.leave(docKey, 'user_a');
    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0].name).toBe('Bob');
  });

  it('should update live cursor positions and active field focus', () => {
    const manager = new PresenceManager();
    const docKey = 'products:prod_456';

    manager.join(docKey, { id: 'user_a', name: 'Alice' });

    const cursor = manager.updateCursor(docKey, 'user_a', {
      field: 'description',
      position: 42,
      selection: { start: 10, end: 42 },
    });

    expect(cursor.field).toBe('description');
    expect(cursor.position).toBe(42);
    expect(cursor.selection?.end).toBe(42);

    const snapshot = manager.getSnapshot(docKey);
    expect(snapshot.cursors).toHaveLength(1);
    expect(snapshot.cursors[0].field).toBe('description');
  });

  it('should manage exclusive field locking and prevent conflicts', () => {
    const manager = new PresenceManager();
    const docKey = 'pages:home';

    manager.join(docKey, { id: 'user_a', name: 'Alice' });
    manager.join(docKey, { id: 'user_b', name: 'Bob' });

    // Alice locks the "heroTitle" field
    const lockResult1 = manager.acquireLock(docKey, 'heroTitle', { id: 'user_a', name: 'Alice' }, 10_000);
    expect(lockResult1.success).toBe(true);
    expect(lockResult1.lock?.fieldName).toBe('heroTitle');
    expect(lockResult1.lock?.userId).toBe('user_a');

    // Bob tries to lock the same field while Alice holds the lock -> rejected
    const lockResult2 = manager.acquireLock(docKey, 'heroTitle', { id: 'user_b', name: 'Bob' }, 10_000);
    expect(lockResult2.success).toBe(false);
    expect(lockResult2.currentLock?.userId).toBe('user_a');

    // Alice releases lock
    const released = manager.releaseLock(docKey, 'heroTitle', 'user_a');
    expect(released).toBe(true);

    // Bob can now acquire lock
    const lockResult3 = manager.acquireLock(docKey, 'heroTitle', { id: 'user_b', name: 'Bob' }, 10_000);
    expect(lockResult3.success).toBe(true);
  });

  it('should auto-release field locks when a user leaves the document', () => {
    const manager = new PresenceManager();
    const docKey = 'articles:article_1';

    manager.join(docKey, { id: 'user_a', name: 'Alice' });
    manager.acquireLock(docKey, 'title', { id: 'user_a', name: 'Alice' });

    const snapshotBefore = manager.getSnapshot(docKey);
    expect(snapshotBefore.locks).toHaveLength(1);

    const { releasedLocks } = manager.leave(docKey, 'user_a');
    expect(releasedLocks).toContain('title');

    const snapshotAfter = manager.getSnapshot(docKey);
    expect(snapshotAfter.locks).toHaveLength(0);
  });

  it('should support in-context editorial comments and resolution', () => {
    const manager = new PresenceManager();
    const docKey = 'posts:post_789';

    manager.join(docKey, { id: 'editor_1', name: 'Elena' });

    const comment = manager.addComment(docKey, {
      id: 'comment_1',
      authorId: 'editor_1',
      authorName: 'Elena',
      field: 'heroImage',
      text: 'Please use high resolution banner here.',
    });

    expect(comment.id).toBe('comment_1');
    expect(comment.resolved).toBe(false);

    let snapshot = manager.getSnapshot(docKey);
    expect(snapshot.comments).toHaveLength(1);

    // Resolve comment
    const resolved = manager.resolveComment(docKey, 'comment_1');
    expect(resolved).toBe(true);

    snapshot = manager.getSnapshot(docKey);
    expect(snapshot.comments[0].resolved).toBe(true);
  });
});
