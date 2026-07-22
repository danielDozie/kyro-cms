<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const tableRef = ref(null)
const isVisible = ref(false)

const columns = ['Feature', 'Kyro CMS', 'Payload CMS', 'Strapi', 'Directus']

const rows = [
  { feature: 'Astro-native',              values: ['check', 'x', 'x', 'x'] },
  { feature: 'Single config file',        values: ['check', 'x', 'x', 'x'] },
  { feature: 'Multi-protocol API',        values: ['4 protocols', 'REST only', 'REST + GraphQL', 'REST + GraphQL'] },
  { feature: 'SQLite + Postgres + MongoDB', values: ['check', 'Postgres + MongoDB', 'SQLite + Postgres + MySQL', 'SQLite + Postgres + MySQL + more'] },
  { feature: 'Auto-generated admin',      values: ['check', 'check', 'check', 'check'] },
  { feature: 'Drafts & versioning',       values: ['check', 'check', 'Plugin', 'check'] },
  { feature: 'TypeScript-first',          values: ['check', 'check', 'Partial', 'x'] },
  { feature: 'Plugin system',             values: ['check', 'check', 'check', 'check'] },
  { feature: 'Open source',              values: ['check', 'check', 'check', 'check'] },
  { feature: 'Edge-ready',               values: ['check', 'x', 'x', 'x'] },
]

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { threshold: 0.1 }
  )
  if (tableRef.value) observer.observe(tableRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <section ref="tableRef" :class="['comparison-section', { visible: isVisible }]">
    <!-- Section header rendered by parent (DocsHome) -->

    <!-- Table Wrapper -->
    <div class="table-wrapper">
      <div class="table-scroll">
        <table class="comparison-table">
          <thead>
            <tr>
              <th
                v-for="(col, ci) in columns"
                :key="ci"
                :class="{ 'col-feature': ci === 0, 'col-kyro': ci === 1, 'col-other': ci > 1 }"
              >
                <span v-if="ci === 1" class="kyro-badge">
                  <span class="kyro-badge-glow" />
                  <span class="kyro-badge-text">{{ col }}</span>
                </span>
                <span v-else>{{ col }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, ri) in rows"
              :key="ri"
              :class="{ 'row-alt': ri % 2 === 1 }"
              :style="{
                '--row-delay': `${ri * 40}ms`,
                animationDelay: `${ri * 40}ms`
              }"
            >
              <td class="cell-feature">{{ row.feature }}</td>
              <td
                v-for="(val, vi) in row.values"
                :key="vi"
                :class="{ 'col-kyro': vi === 0, 'col-other': vi > 0 }"
              >
                <!-- Check icon -->
                <span v-if="val === 'check'" class="icon-check" aria-label="Supported">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="10" fill="rgba(34,197,94,0.15)" />
                    <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <!-- X icon -->
                <span v-else-if="val === 'x'" class="icon-x" aria-label="Not supported">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="10" fill="rgba(102,102,102,0.15)" />
                    <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#666" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
                <!-- Text value -->
                <span v-else class="cell-text">{{ val }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ----------------------------------------------------------------
   Section container
   ---------------------------------------------------------------- */
.comparison-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 2rem 5rem;
  opacity: 0;
  transform: translateY(32px);
  filter: blur(8px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.comparison-section.visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

/* ----------------------------------------------------------------
   Section header
   ---------------------------------------------------------------- */
.section-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.section-title {
  font-family: var(--vp-font-family-base);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.2;
  color: var(--k-text-1);
  margin: 0 0 0.5rem;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: var(--k-text-2);
  margin: 0;
}

/* ----------------------------------------------------------------
   Table wrapper — rounded, bordered, scrollable
   ---------------------------------------------------------------- */
.table-wrapper {
  border: 1px solid var(--k-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--k-bg-root);
  box-shadow:
    0 0 0 1px var(--k-border),
    0 4px 24px -4px rgba(0, 0, 0, 0.3),
    0 0 48px -12px rgba(255, 255, 255, 0.03);
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* ----------------------------------------------------------------
   Table base
   ---------------------------------------------------------------- */
.comparison-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: var(--vp-font-family-base);
}

/* ----------------------------------------------------------------
   Header row
   ---------------------------------------------------------------- */
.comparison-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.comparison-table th {
  padding: 0.875rem 1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--k-text-3);
  text-align: center;
  background: var(--k-bg-mute);
  border-bottom: 1px solid var(--k-border);
  white-space: nowrap;
  position: relative;
}

.comparison-table th.col-feature {
  text-align: left;
  width: 26%;
}

.comparison-table th.col-kyro {
  color: var(--k-text-1);
}

/* ----------------------------------------------------------------
   Kyro badge in header
   ---------------------------------------------------------------- */
.kyro-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: kyro-glow-pulse 2s infinite ease-in-out;
}

.kyro-badge-glow {
  position: absolute;
  inset: -4px;
  border-radius: 24px;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.12) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
}

.kyro-badge-text {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #ffffff 0%, #a1a1a1 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ----------------------------------------------------------------
   Body rows
   ---------------------------------------------------------------- */
.comparison-table tbody tr {
  opacity: 0;
  transition: background-color 0.15s ease;
}

.comparison-table tbody tr.row-alt td {
  background-color: var(--k-bg-soft);
}

.comparison-table tbody tr.row-alt td.col-kyro {
  background-color: rgba(255, 255, 255, 0.04);
}

.comparison-table tbody tr:hover td {
  background-color: var(--k-bg-mute);
}

.comparison-table tbody tr:hover td.col-kyro {
  background-color: rgba(255, 255, 255, 0.06);
}

/* ----------------------------------------------------------------
   Cells
   ---------------------------------------------------------------- */
.comparison-table td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  text-align: center;
  vertical-align: middle;
  color: var(--k-text-2);
  border-bottom: 1px solid var(--k-border);
  transition: background-color 0.15s ease;
}

.comparison-table tbody tr:last-child td {
  border-bottom: none;
}

.cell-feature {
  text-align: left !important;
  font-weight: 500;
  color: var(--k-text-1) !important;
  white-space: nowrap;
}

/* Kyro column tint */
.comparison-table td.col-kyro {
  background-color: rgba(255, 255, 255, 0.02);
  position: relative;
}

/* Subtle left/right border for kyro column */
.comparison-table th.col-kyro,
.comparison-table td.col-kyro {
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.05),
    inset -1px 0 0 rgba(255, 255, 255, 0.05);
}

/* ----------------------------------------------------------------
   Icon cells
   ---------------------------------------------------------------- */
.icon-check,
.icon-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-check svg,
.icon-x svg {
  flex-shrink: 0;
}

/* ----------------------------------------------------------------
   Text value cells
   ---------------------------------------------------------------- */
.cell-text {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--k-text-2);
}

/* ----------------------------------------------------------------
   Row entrance animation
   ---------------------------------------------------------------- */
.comparison-section.visible .comparison-table tbody tr {
  animation: row-wipe-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.icon-check path {
  stroke-dasharray: 12;
  stroke-dashoffset: 12;
}

.comparison-section.visible .icon-check path {
  animation: stroke-draw 0.5s ease-out forwards;
  animation-delay: calc(var(--row-delay, 0ms) + 150ms);
}

@keyframes row-wipe-in {
  0% {
    opacity: 0;
    transform: translateX(-24px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes stroke-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes kyro-glow-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px var(--k-accent-glow, rgba(255, 255, 255, 0.1)));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 8px var(--k-accent-glow, rgba(255, 255, 255, 0.25)));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px var(--k-accent-glow, rgba(255, 255, 255, 0.1)));
  }
}

/* ----------------------------------------------------------------
   Light mode adjustments
   ---------------------------------------------------------------- */
:root:not(.dark) .table-wrapper {
  box-shadow:
    0 0 0 1px var(--k-border),
    0 4px 24px -4px rgba(0, 0, 0, 0.08),
    0 0 48px -12px rgba(0, 0, 0, 0.03);
}

:root:not(.dark) .comparison-table td.col-kyro {
  background-color: rgba(0, 0, 0, 0.02);
}

:root:not(.dark) .comparison-table tbody tr.row-alt td.col-kyro {
  background-color: rgba(0, 0, 0, 0.03);
}

:root:not(.dark) .comparison-table tbody tr:hover td.col-kyro {
  background-color: rgba(0, 0, 0, 0.05);
}

:root:not(.dark) .kyro-badge {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.05) 50%,
    rgba(0, 0, 0, 0.03) 100%
  );
  border-color: rgba(0, 0, 0, 0.12);
}

:root:not(.dark) .kyro-badge-glow {
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.06) 0%,
    transparent 70%
  );
}

/* ----------------------------------------------------------------
   Prefers reduced motion
   ---------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .comparison-section {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }
  .comparison-table tbody tr {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .icon-check path {
    stroke-dasharray: none !important;
    stroke-dashoffset: 0 !important;
    animation: none !important;
  }
  .kyro-badge {
    animation: none !important;
    transform: none !important;
    filter: none !important;
  }
}

/* ----------------------------------------------------------------
   Mobile breakpoints
   ---------------------------------------------------------------- */
@media (max-width: 768px) {
  .comparison-section {
    padding: 3rem 1rem;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 0.625rem 0.75rem;
  }

  .comparison-table td {
    font-size: 0.8125rem;
  }

  .cell-text {
    font-size: 0.75rem;
  }
}
</style>
