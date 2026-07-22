<script setup>
const reasons = [
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    title: 'Astro-first, framework-agnostic',
    desc: 'Deep Astro integration out of the box — SSR, islands, and content collections. But the API and admin work anywhere.',
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    title: 'Multi-Protocol API',
    desc: 'Write one schema. Get REST, GraphQL, tRPC, and WebSocket APIs automatically. No boilerplate, no duplication.',
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    title: 'TypeScript-first, end to end',
    desc: 'Zod schemas drive your config, your APIs, and your admin — full type safety without a single codegen step.',
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    title: 'Multi-Database',
    desc: 'SQLite for local dev, Postgres or MongoDB for production. Swap in one line — no schema rewrites, no migration pain.',
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: 'Open Source, truly',
    desc: 'MIT licensed. No usage tiers, no vendor lock-in. Self-host on a laptop, a VPS, or the edge — forever free.',
  },
]
</script>

<template>
  <section class="wk-section">
    <div class="wk-inner">
      <span class="wk-label">WHY KYRO</span>
      <h2 class="wk-title">The CMS that ships your stack.</h2>
      <p class="wk-desc">Five reasons developers choose Kyro over everything else for production content apps.</p>

      <div class="wk-grid">
        <div v-for="(r, i) in reasons" :key="i" class="wk-card">
          <div class="wk-card-icon" v-html="r.icon"></div>
          <h3 class="wk-card-title">{{ r.title }}</h3>
          <p class="wk-card-desc">{{ r.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wk-section {
  padding: 100px 24px;
}

.wk-inner {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
}

.wk-label {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--k-accent, #6366f1);
  margin-bottom: 14px;
}

.wk-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--k-text-1, #ededed);
  margin: 0 0 14px;
  line-height: 1.15;
}

.wk-desc {
  font-size: 1rem;
  color: var(--k-text-2, #a1a1a1);
  max-width: 480px;
  margin: 0 auto 48px;
  line-height: 1.7;
}

.wk-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.wk-card {
  padding: 28px 20px;
  border-radius: 14px;
  border: 1px solid var(--k-border, rgba(255,255,255,0.08));
  background: var(--k-bg-root, #000);
  text-align: left;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}

.wk-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5),
              0 0 30px -10px rgba(99, 102, 241, 0.1);
}

.wk-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--k-accent-ghost, rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.15);
  color: var(--k-accent, #6366f1);
  margin-bottom: 16px;
}

.wk-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--k-text-1, #ededed);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.wk-card-desc {
  font-size: 0.82rem;
  color: var(--k-text-2, #a1a1a1);
  margin: 0;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .wk-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .wk-section { padding: 70px 20px; }
  .wk-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .wk-grid { grid-template-columns: 1fr; }
}
</style>
