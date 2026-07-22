<script setup>
const stats = [
  { value: 'MIT', label: 'License' },
  { value: '15+', label: 'Field Types' },
  { value: '4', label: 'API Protocols' },
  { value: '3', label: 'Databases' },
]

const testimonials = [
  {
    quote: "Kyro is what Payload should have been if it were built for Astro from day one. The multi-protocol API generation is a game changer.",
    name: "Sarah Chen",
    role: "Senior Frontend Engineer",
    avatar: "SC",
  },
  {
    quote: "We migrated from Strapi in a weekend. The TypeScript-first approach means we catch errors at compile time, not in production.",
    name: "Marcus Rivera",
    role: "CTO, NextStack",
    avatar: "MR",
  },
  {
    quote: "Finally, a CMS that doesn't force you into a specific frontend. Kyro works with React, Vue, Svelte — whatever you want.",
    name: "Anya Patel",
    role: "Full-Stack Developer",
    avatar: "AP",
  },
]
</script>

<template>
  <section class="ts-section">
    <div class="ts-inner">
      <span class="ts-label">TESTIMONIALS</span>
      <h2 class="ts-title">Trusted by developers</h2>
      <p class="ts-desc">Teams building production content apps choose Kyro for its developer experience and flexibility.</p>

      <!-- Stats row -->
      <div class="ts-stats">
        <div v-for="s in stats" :key="s.label" class="ts-stat">
          <span class="ts-stat-value">{{ s.value }}</span>
          <span class="ts-stat-label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Testimonial cards -->
      <div class="ts-grid">
        <div v-for="(t, i) in testimonials" :key="i" class="ts-card">
          <div class="ts-card-quote">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ts-quote-icon"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
            <p class="ts-card-text">{{ t.quote }}</p>
          </div>
          <div class="ts-card-author">
            <div class="ts-avatar">{{ t.avatar }}</div>
            <div>
              <div class="ts-author-name">{{ t.name }}</div>
              <div class="ts-author-role">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ts-section {
  padding: 100px 24px;
}

.ts-inner {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
}

.ts-label {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--k-accent, #6366f1);
  margin-bottom: 14px;
}

.ts-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--k-text-1, #ededed);
  margin: 0 0 14px;
  line-height: 1.15;
}

.ts-desc {
  font-size: 1rem;
  color: var(--k-text-2, #a1a1a1);
  max-width: 500px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

/* Stats */
.ts-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 56px;
  padding: 24px 0;
  border-top: 1px solid var(--k-border, rgba(255,255,255,0.08));
  border-bottom: 1px solid var(--k-border, rgba(255,255,255,0.08));
}

.ts-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ts-stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--k-text-1, #ededed);
}

.ts-stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--k-text-3, #666666);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Cards */
.ts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.ts-card {
  padding: 28px 24px;
  border-radius: 14px;
  border: 1px solid var(--k-border, rgba(255,255,255,0.08));
  background: var(--k-bg-root, #000);
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease;
}

.ts-card:hover {
  transform: translateY(-3px);
  border-color: var(--k-border-hover, rgba(255,255,255,0.16));
}

.ts-card-quote {
  margin-bottom: 24px;
}

.ts-quote-icon {
  color: var(--k-accent, #6366f1);
  opacity: 0.5;
  margin-bottom: 12px;
}

.ts-card-text {
  font-size: 0.88rem;
  color: var(--k-text-2, #a1a1a1);
  line-height: 1.65;
  margin: 0;
}

.ts-card-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ts-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--k-accent-ghost, rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.15);
  color: var(--k-accent, #6366f1);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ts-author-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--k-text-1, #ededed);
}

.ts-author-role {
  font-size: 0.72rem;
  color: var(--k-text-3, #666666);
}

/* Responsive */
@media (max-width: 768px) {
  .ts-section { padding: 70px 20px; }
  .ts-stats { gap: 24px; flex-wrap: wrap; }
  .ts-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
}
</style>
