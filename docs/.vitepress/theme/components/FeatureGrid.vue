<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const features = [
  {
    title: 'One Config, Every API',
    description:
      'Define collections once and expose REST, GraphQL, tRPC, and WebSocket endpoints instantly. No extra setup.',
    icon: 'wand',
    size: 'large',
  },
  {
    title: 'Multi-Database Support',
    description:
      'Start with SQLite locally, scale to PostgreSQL or MongoDB — zero schema rewrites.',
    icon: 'database',
    size: 'small',
  },
  {
    title: 'Auto-Generated Admin',
    description:
      'A full dashboard with forms, media library, auth, drafts, and RBAC on install.',
    icon: 'dashboard',
    size: 'small',
  },
  {
    title: 'Astro-First DX',
    description:
      'Browser-safe client bundles and server-only backend imports designed for Astro islands architecture.',
    icon: 'bolt',
    size: 'small',
  },
  {
    title: 'Built-in Auth & Security',
    description:
      'Sessions, JWT, RBAC, and row-level access control baked in.',
    icon: 'shield',
    size: 'small',
  },
  {
    title: 'Plugin System',
    description:
      'Add hooks, fields, admin components, and custom integrations without touching core.',
    icon: 'puzzle',
    size: 'medium',
  },
  {
    title: 'Drafts & Versioning',
    description:
      'Track revisions, publish drafts, roll back — with a complete audit trail for every document.',
    icon: 'history',
    size: 'medium',
  },
  {
    title: 'Multi-Tenant Ready',
    description:
      'Scoped collections, permissions, and access control designed for SaaS-scale from day one.',
    icon: 'globe',
    size: 'small',
  },
]

const sectionRef = ref(null)
const isVisible = ref(false)
let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        if (observer) observer.disconnect()
      }
    },
    { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

const handleMouseMove = (e) => {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  card.style.setProperty('--mx', `${x}px`)
  card.style.setProperty('--my', `${y}px`)
}
</script>

<template>
  <div
    ref="sectionRef"
    class="fg-root"
    :class="{ 'is-visible': isVisible }"
  >
    <div class="fg-bento">
      <div
        v-for="(feature, index) in features"
        :key="feature.title"
        class="fg-card"
        :class="[`fg-card--${feature.size}`, `fg-card--${feature.icon}`]"
        :style="{ '--delay': `${index * 60}ms` }"
        @pointermove="handleMouseMove"
      >
        <!-- Rotating gradient border -->
        <div class="fg-card-border" aria-hidden="true" />
        <!-- Inner background mask -->
        <div class="fg-card-bg" aria-hidden="true" />
        <!-- Cursor spotlight -->
        <div class="fg-spotlight" aria-hidden="true" />

        <div class="fg-card-inner">
          <div class="fg-icon">
            <!-- Wand / Magic -->
            <svg v-if="feature.icon === 'wand'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 4-1.17 2.83L11 8l2.83 1.17L15 12l1.17-2.83L19 8l-2.83-1.17Z" />
              <path d="m9 15-1.5-3L4 10.5l3.5-1.5L9 5.5l1.5 3.5 3.5 1.5-3.5 1.5Z" opacity="0.5" />
              <line x1="2" y1="22" x2="22" y2="2" />
            </svg>
            <!-- Database -->
            <svg v-else-if="feature.icon === 'database'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
            <!-- Dashboard -->
            <svg v-else-if="feature.icon === 'dashboard'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            <!-- Bolt -->
            <svg v-else-if="feature.icon === 'bolt'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <!-- Shield -->
            <svg v-else-if="feature.icon === 'shield'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <!-- Puzzle -->
            <svg v-else-if="feature.icon === 'puzzle'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15.5 2H18a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 1 0 3V12a2 2 0 0 1-2 2h-2.5a1.5 1.5 0 0 1-3 0H10a2 2 0 0 1-2-2V9.5a1.5 1.5 0 0 1 0-3V4a2 2 0 0 1 2-2h2.5a1.5 1.5 0 0 1 3 0Z" />
            </svg>
            <!-- History -->
            <svg v-else-if="feature.icon === 'history'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <!-- Globe -->
            <svg v-else-if="feature.icon === 'globe'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <h3 class="fg-title">{{ feature.title }}</h3>
          <p class="fg-desc">{{ feature.description }}</p>

          <!-- Arrow indicator -->
          <div class="fg-arrow" aria-hidden="true">→</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   ROOT
   ================================================================ */
.fg-root {
  width: 100%;
  padding: 2rem 2rem 5rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* ================================================================
   BENTO GRID
   ================================================================ */
.fg-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(180px, auto);
  gap: 1.25rem;
}

@media (max-width: 960px) {
  .fg-bento { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .fg-bento { grid-template-columns: 1fr; }
}

/* ================================================================
   CARDS — size variants
   ================================================================ */
.fg-card {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  cursor: default;
  will-change: transform, opacity;

  /* Scroll-reveal start state */
  opacity: 0;
  transform: translateY(28px);
}

.fg-root.is-visible .fg-card {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.55s var(--k-ease-smooth) var(--delay, 0ms),
    transform 0.55s var(--k-ease-smooth) var(--delay, 0ms);
}

/* Large card spans 2 columns + 2 rows */
.fg-card--large {
  grid-column: span 2;
  grid-row: span 2;
}

/* Medium card spans 2 columns */
.fg-card--medium {
  grid-column: span 2;
}

/* Small card: default (1 column, 1 row) */
.fg-card--small {
  grid-column: span 1;
}

@media (max-width: 960px) {
  .fg-card--large  { grid-column: span 2; grid-row: span 2; }
  .fg-card--medium { grid-column: span 2; }
  .fg-card--small  { grid-column: span 1; }
}

@media (max-width: 600px) {
  .fg-card--large,
  .fg-card--medium,
  .fg-card--small {
    grid-column: span 1;
    grid-row: span 1;
  }
}

/* ================================================================
   CARD LAYERS
   ================================================================ */

/* Rotating conic gradient border */
.fg-card-border {
  position: absolute;
  inset: -1px;
  border-radius: 15px;
  background: var(--k-border);
  transition: background 0.3s ease;
  z-index: 0;
}

/* Inner mask fills card leaving only 1px border visible */
.fg-card-bg {
  position: absolute;
  inset: 1px;
  background: var(--k-bg-root);
  border-radius: 13px;
  z-index: 1;
  transition: background 0.25s ease;
}

/* Hover spotlight */
.fg-spotlight {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(
    380px circle at var(--mx, 50%) var(--my, 50%),
    rgba(99, 102, 241, 0.07),
    transparent 45%
  );
  transition: opacity 0.3s ease;
  border-radius: 14px;
}

/* Inner content */
.fg-card-inner {
  position: relative;
  z-index: 3;
  padding: 1.75rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fg-card--large .fg-card-inner {
  padding: 2.25rem;
}

/* ================================================================
   HOVER STATE
   ================================================================ */
.fg-card:hover .fg-card-border {
  background: conic-gradient(
    from calc(var(--gradient-angle, 0deg)),
    rgba(99,102,241,0.35) 0deg,
    rgba(99,102,241,0.1) 60deg,
    rgba(99,102,241,0.04) 120deg,
    rgba(99,102,241,0.1) 180deg,
    rgba(99,102,241,0.35) 240deg,
    rgba(99,102,241,0.1) 300deg,
    rgba(99,102,241,0.35) 360deg
  );
  animation: border-spin 4s linear infinite;
}

@property --gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes border-spin {
  to { --gradient-angle: 360deg; }
}

.fg-card:hover .fg-spotlight {
  opacity: 1;
}

.fg-card:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 16px 40px -12px rgba(0,0,0,0.35);
  transition:
    transform 0.25s var(--k-ease-smooth),
    box-shadow 0.25s var(--k-ease-smooth) !important;
}

/* ================================================================
   ICON
   ================================================================ */
.fg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: var(--k-bg-mute);
  border: 1px solid var(--k-border);
  color: var(--k-text-1);
  margin-bottom: 1rem;
  flex-shrink: 0;
  transition:
    transform 0.25s var(--k-ease-smooth),
    box-shadow 0.25s var(--k-ease-smooth),
    border-color 0.15s ease;
}

.fg-card--large .fg-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
}

.fg-card:hover .fg-icon {
  transform: scale(1.08);
  box-shadow: 0 0 16px rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.3);
}

/* ================================================================
   TYPOGRAPHY
   ================================================================ */
.fg-title {
  font-family: var(--vp-font-family-base);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--k-text-1);
  line-height: 1.3;
  margin: 0 0 0.5rem;
}

.fg-card--large .fg-title {
  font-size: 1.375rem;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
}

.fg-desc {
  font-family: var(--vp-font-family-base);
  font-size: 0.8125rem;
  color: var(--k-text-2);
  line-height: 1.65;
  margin: 0;
  flex: 1;
}

.fg-card--large .fg-desc {
  font-size: 0.9375rem;
  max-width: 440px;
}

/* Arrow — appears on hover */
.fg-arrow {
  margin-top: 1.25rem;
  font-size: 0.875rem;
  color: var(--k-text-3);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.2s ease, transform 0.2s ease, color 0.15s ease;
}

.fg-card:hover .fg-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--k-text-2);
}

/* ================================================================
   LIGHT MODE
   ================================================================ */
:root:not(.dark) .fg-card-bg {
  background: var(--k-bg-soft);
}

:root:not(.dark) .fg-card:hover .fg-card-border {
  background: conic-gradient(
    from calc(var(--gradient-angle, 0deg)),
    rgba(0,0,0,0.2) 0deg,
    rgba(0,0,0,0.06) 60deg,
    rgba(0,0,0,0.02) 120deg,
    rgba(0,0,0,0.06) 180deg,
    rgba(0,0,0,0.2) 240deg,
    rgba(0,0,0,0.06) 300deg,
    rgba(0,0,0,0.2) 360deg
  );
}

:root:not(.dark) .fg-spotlight {
  background: radial-gradient(
    380px circle at var(--mx, 50%) var(--my, 50%),
    rgba(0,0,0,0.03),
    transparent 45%
  );
}

/* ================================================================
   REDUCED MOTION
   ================================================================ */
@media (prefers-reduced-motion: reduce) {
  .fg-card {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  .fg-card:hover {
    transform: none !important;
    box-shadow: none !important;
  }

  .fg-card:hover .fg-card-border {
    animation: none !important;
    background: var(--k-border-hover);
  }

  .fg-card:hover .fg-icon {
    transform: none !important;
  }

  .fg-arrow {
    opacity: 1 !important;
    transform: none !important;
  }

  .fg-spotlight {
    display: none !important;
  }
}
</style>
