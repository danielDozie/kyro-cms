<script setup>
import { ref } from 'vue'

const copiedStep = ref(null)
const command = 'npm create kyro@latest'
const devCommand = 'npm run dev'

const schemaCode = `import { defineConfig, createLocalAdapter } from '@kyro-cms/core'

export default defineConfig({
  adapter: createLocalAdapter({ path: './data/kyro.db' }),
  collections: [{
    slug: 'posts',
    label: 'Posts',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext' },
      { name: 'status', type: 'select', options: [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }] }
    ]
  }]
})`

function copyText(text, step) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      copiedStep.value = step
      setTimeout(() => { copiedStep.value = null }, 1800)
    })
  }
}
</script>

<template>
  <section class="qs-section">
    <div class="qs-inner">
      <span class="qs-label">QUICK START</span>
      <h2 class="qs-title">Up and running in 30 seconds</h2>
      <p class="qs-desc">Three commands. One config file. Four API protocols ready to go.</p>

      <div class="qs-steps">
        <!-- Step 1 -->
        <div class="qs-step">
          <div class="qs-step-num">1</div>
          <div class="qs-step-content">
            <h3>Create your project</h3>
            <p>Scaffold a new Kyro project with the interactive wizard.</p>
            <div class="qs-code-pill">
              <code>
                <span class="qs-prompt">~</span>
                <span class="qs-dollar">$</span>
                <span class="qs-cmd">{{ command }}</span>
              </code>
              <button
                class="qs-copy"
                :class="{ copied: copiedStep === 1 }"
                @click="copyText(command, 1)"
                type="button"
              >
                <svg v-if="copiedStep !== 1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ copiedStep === 1 ? 'Copied!' : '' }}
              </button>
            </div>
          </div>
          <div class="qs-step-connector" aria-hidden="true"></div>
        </div>

        <!-- Step 2 -->
        <div class="qs-step">
          <div class="qs-step-num">2</div>
          <div class="qs-step-content">
            <h3>Define your schema</h3>
            <p>Add collections with Zod validation in <code>kyro.config.ts</code>.</p>
            <div class="qs-code-block">
              <div class="qs-code-chrome">
                <span class="qs-cd-dot qs-cd-r"></span>
                <span class="qs-cd-dot qs-cd-y"></span>
                <span class="qs-cd-dot qs-cd-g"></span>
                <span class="qs-cd-file">kyro.config.ts</span>
              </div>
              <pre class="qs-code-body"><code>{{ schemaCode }}</code></pre>
              <button
                class="qs-copy qs-copy-inline"
                :class="{ copied: copiedStep === 2 }"
                @click="copyText(schemaCode, 2)"
                type="button"
              >
                <svg v-if="copiedStep !== 2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ copiedStep === 2 ? 'Copied!' : '' }}
              </button>
            </div>
          </div>
          <div class="qs-step-connector" aria-hidden="true"></div>
        </div>

        <!-- Step 3 -->
        <div class="qs-step">
          <div class="qs-step-num">3</div>
          <div class="qs-step-content">
            <h3>Start building</h3>
            <p>Launch the dev server with admin dashboard and all APIs live.</p>
            <div class="qs-code-pill">
              <code>
                <span class="qs-prompt">~</span>
                <span class="qs-dollar">$</span>
                <span class="qs-cmd">{{ devCommand }}</span>
              </code>
              <button
                class="qs-copy"
                :class="{ copied: copiedStep === 3 }"
                @click="copyText(devCommand, 3)"
                type="button"
              >
                <svg v-if="copiedStep !== 3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ copiedStep === 3 ? 'Copied!' : '' }}
              </button>
            </div>
            <div class="qs-live-badge">
              <span class="qs-live-dot"></span>
              <span>REST, GraphQL, tRPC &amp; WebSocket APIs are now live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.qs-section {
  padding: 100px 24px;
  position: relative;
}

.qs-inner {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.qs-label {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--k-accent, #6366f1);
  margin-bottom: 14px;
}

.qs-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--k-text-1, #ededed);
  margin: 0 0 14px;
  line-height: 1.15;
}

.qs-desc {
  font-size: 1rem;
  color: var(--k-text-2, #a1a1a1);
  max-width: 480px;
  margin: 0 auto 56px;
  line-height: 1.7;
}

.qs-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  text-align: left;
}

.qs-step {
  position: relative;
  display: flex;
  gap: 20px;
  padding-bottom: 40px;
}

.qs-step:last-child {
  padding-bottom: 0;
}

.qs-step-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--k-accent, #6366f1);
  background: var(--k-accent-ghost, rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  position: relative;
  z-index: 1;
}

.qs-step-connector {
  position: absolute;
  left: 17px;
  top: 40px;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, var(--k-border, rgba(255,255,255,0.08)), transparent);
}

.qs-step:last-child .qs-step-connector {
  display: none;
}

.qs-step-content {
  flex: 1;
  min-width: 0;
}

.qs-step-content h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--k-text-1, #ededed);
  margin: 6px 0 6px;
  letter-spacing: -0.01em;
}

.qs-step-content p {
  font-size: 0.88rem;
  color: var(--k-text-2, #a1a1a1);
  margin: 0 0 16px;
  line-height: 1.6;
}

.qs-step-content p code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: var(--k-code-bg, #0a0a0a);
  border: 1px solid var(--k-code-border, rgba(255,255,255,0.06));
  color: var(--k-text-1, #ededed);
}

/* Code pill (steps 1 & 3) */
.qs-code-pill {
  display: inline-flex;
  align-items: center;
  gap: 0;
  background: var(--k-bg-glass, rgba(10, 10, 10, 0.7));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--k-border, rgba(255,255,255,0.08));
  border-radius: 10px;
  padding: 0.15rem 0.15rem 0.15rem 1rem;
  transition: border-color 0.15s ease;
}

.qs-code-pill:hover {
  border-color: var(--k-border-hover, rgba(255,255,255,0.16));
}

.qs-code-pill code {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-family: var(--vp-font-family-mono);
  user-select: all;
  white-space: nowrap;
}

.qs-prompt { color: var(--k-text-1, #ededed); font-weight: 600; }
.qs-dollar { color: var(--k-text-3, #666666); }
.qs-cmd { color: var(--k-text-2, #a1a1a1); }

/* Code block (step 2) */
.qs-code-block {
  background: #0a0a0f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.qs-code-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.qs-cd-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.qs-cd-r { background: #ff5f57; }
.qs-cd-y { background: #febc2e; }
.qs-cd-g { background: #28c840; }

.qs-cd-file {
  margin-left: 8px;
  font-size: 0.72rem;
  font-family: var(--vp-font-family-mono);
  color: var(--k-text-3, #666666);
}

.qs-code-body {
  margin: 0;
  padding: 18px 20px;
  font-size: 0.78rem;
  font-family: var(--vp-font-family-mono);
  line-height: 1.7;
  color: var(--k-text-2, #a1a1a1);
  overflow-x: auto;
  max-height: 280px;
}

.qs-code-body code {
  font-family: inherit;
  white-space: pre;
}

/* Copy buttons */
.qs-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--k-text-3, #666666);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  cursor: pointer;
  font-family: var(--vp-font-family-base);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.qs-copy:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--k-text-1, #ededed);
}

.qs-copy.copied {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.qs-copy-inline {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* Live badge */
.qs-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #10b981;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 9999px;
}

.qs-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .qs-section { padding: 70px 20px; }
  .qs-step { gap: 14px; }
  .qs-code-block { font-size: 0.7rem; }
}

@media (prefers-reduced-motion: reduce) {
  .qs-live-dot { animation: none; }
}
</style>
