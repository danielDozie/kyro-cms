<script setup>
import { ref } from 'vue'

const openIndex = ref(null)

function toggle(i) {
  openIndex.value = openIndex.value === i ? null : i
}

const faqs = [
  {
    q: 'What databases does Kyro support?',
    a: 'Kyro ships with three database adapters: PostgreSQL, MongoDB, and SQLite. You can switch between them by changing a single line in your config — no code changes required.',
  },
  {
    q: 'Can I use Kyro with an existing Astro project?',
    a: 'Yes. Install @kyro/core, add the integration to your astro.config, and define your collections. Kyro runs alongside your existing pages and components without conflicts.',
  },
  {
    q: 'Is Kyro production-ready?',
    a: 'Kyro is used in production today. It includes authentication, role-based access control, draft/publish workflows, autosave, version history, and multi-tenancy — everything you need for real applications.',
  },
  {
    q: 'How does Kyro compare to Payload or Strapi?',
    a: 'Kyro is Astro-native (not a standalone Node server), generates four API protocols from one schema (REST, GraphQL, tRPC, WebSocket), and uses TypeScript-first Zod schemas instead of JSON config. See the full comparison in the docs.',
  },
  {
    q: 'Do I need to know TypeScript to use Kyro?',
    a: 'Kyro is built with TypeScript, but you can use JavaScript in your Astro pages. The collection definitions use Zod, which provides excellent error messages even if you are not a TypeScript expert.',
  },
  {
    q: 'Is there a hosted version or is it self-host only?',
    a: 'Currently Kyro is self-hosted and open source under the MIT license. A managed Pro tier with one-click deployment is on the roadmap.',
  },
]
</script>

<template>
  <section class="faq-section">
    <div class="faq-inner">
      <span class="faq-label">FAQ</span>
      <h2 class="faq-title">Frequently asked questions</h2>
      <p class="faq-desc">Everything you need to know about getting started with Kyro.</p>

      <div class="faq-list">
        <div
          v-for="(faq, i) in faqs"
          :key="i"
          class="faq-item"
          :class="{ open: openIndex === i }"
        >
          <button class="faq-question" @click="toggle(i)" type="button">
            <span>{{ faq.q }}</span>
            <svg
              class="faq-chevron"
              :class="{ rotated: openIndex === i }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="faq-answer" :class="{ visible: openIndex === i }">
            <p>{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-section {
  padding: 100px 24px;
}

.faq-inner {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
}

.faq-label {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--k-accent, #6366f1);
  margin-bottom: 14px;
}

.faq-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--k-text-1, #ededed);
  margin: 0 0 14px;
  line-height: 1.15;
}

.faq-desc {
  font-size: 1rem;
  color: var(--k-text-2, #a1a1a1);
  margin: 0 auto 48px;
  line-height: 1.7;
}

.faq-list {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.faq-item {
  border-bottom: 1px solid var(--k-border, rgba(255,255,255,0.08));
}

.faq-item:first-child {
  border-top: 1px solid var(--k-border, rgba(255,255,255,0.08));
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--vp-font-family-base);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--k-text-1, #ededed);
  text-align: left;
  transition: color 0.15s ease;
}

.faq-question:hover {
  color: var(--k-accent, #6366f1);
}

.faq-chevron {
  flex-shrink: 0;
  color: var(--k-text-3, #666666);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.faq-chevron.rotated {
  transform: rotate(180deg);
}

.faq-answer {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              padding 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.faq-answer.visible {
  max-height: 200px;
}

.faq-answer p {
  font-size: 0.88rem;
  color: var(--k-text-2, #a1a1a1);
  line-height: 1.7;
  margin: 0 0 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .faq-section { padding: 70px 20px; }
}
</style>
