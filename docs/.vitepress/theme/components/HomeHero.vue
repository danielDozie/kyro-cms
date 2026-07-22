<script setup>
import { ref, onMounted } from 'vue'
import pkg from '../../package.json'

const versionText = `v${pkg.version}`
const copied = ref(false)
const mounted = ref(false)
const command = 'npm create kyro@latest'

const taglineText = 'TypeScript-native headless CMS'
const displayedTagline = ref(taglineText) // Pre-fill for SSR / SEO
const typingComplete = ref(false)

const apiProtocolsVal = ref(4)
const dbAdaptersVal = ref(3)
const fieldTypesVal = ref(15)

const randomPositions = ref([])
const heroInner = ref(null)

function copyCommand() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(command).then(() => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 1800)
    })
  }
}

function easeOutQuad(t) {
  return t * (2 - t)
}

function animateCounter(refVar, targetVal, durationMs) {
  const startTime = performance.now()
  const startVal = 0
  
  function update(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / durationMs, 1)
    const easedProgress = easeOutQuad(progress)
    refVar.value = Math.floor(startVal + easedProgress * targetVal)
    
    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      refVar.value = targetVal
    }
  }
  requestAnimationFrame(update)
}

onMounted(() => {
  mounted.value = true
  
  // 1. Generate particle positions client-side to avoid SSR hydration mismatch
  randomPositions.value = Array.from({ length: 25 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1.5,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -30
  }))

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 2. Typewriter Effect
  if (prefersReduced) {
    displayedTagline.value = taglineText
    typingComplete.value = true
  } else {
    displayedTagline.value = ''
    let index = 0
    const typewriterTimer = setInterval(() => {
      if (index < taglineText.length) {
        displayedTagline.value += taglineText.charAt(index)
        index++
      } else {
        clearInterval(typewriterTimer)
        typingComplete.value = true
      }
    }, 75)
  }

  // 3. Counter Animations
  if (prefersReduced) {
    apiProtocolsVal.value = 4
    dbAdaptersVal.value = 3
    fieldTypesVal.value = 15
  } else {
    apiProtocolsVal.value = 0
    dbAdaptersVal.value = 0
    fieldTypesVal.value = 0
    setTimeout(() => {
      animateCounter(apiProtocolsVal, 4, 1500)
      animateCounter(dbAdaptersVal, 3, 1500)
      animateCounter(fieldTypesVal, 15, 1500)
    }, 200)
  }

  // 4. IntersectionObserver for Scroll Reveal
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -40px 0px'
    })
    
    const elements = heroInner.value?.querySelectorAll('.reveal-item')
    elements?.forEach((el) => observer.observe(el))
  } else {
    // Reveal all elements immediately for reduced motion / unsupported browsers
    const elements = heroInner.value?.querySelectorAll('.reveal-item')
    elements?.forEach((el) => el.classList.add('is-visible'))
  }
})
</script>

<template>
  <section class="hero-root" aria-label="Kyro CMS introduction">
    <!-- Animated gradient mesh background -->
    <div class="hero-bg" aria-hidden="true">
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />
      <div class="orb orb-4" />
      
      <!-- Particle Constellation Field -->
      <div v-if="mounted" class="particle-field">
        <div 
          v-for="i in randomPositions.length" 
          :key="i" 
          class="particle" 
          :style="{
            left: `${randomPositions[i - 1]?.x}%`,
            top: `${randomPositions[i - 1]?.y}%`,
            width: `${randomPositions[i - 1]?.size}px`,
            height: `${randomPositions[i - 1]?.size}px`,
            animationDuration: `${randomPositions[i - 1]?.duration}s`,
            animationDelay: `${randomPositions[i - 1]?.delay}s`
          }" 
        />
      </div>
      
      <div class="noise-overlay" />
    </div>

    <div ref="heroInner" class="hero-inner">
      <!-- Floating version badge -->
      <div class="version-badge reveal-item" style="transition-delay: 0s">
        <span class="badge-dot" />
        <span class="badge-text">{{ versionText }}</span>
      </div>

      <!-- Brand -->
      <h1 class="brand reveal-item" style="transition-delay: 0.1s">
        <div class="logo-wrapper">
          <div class="logo-ring" aria-hidden="true" />
          <img src="/logo-white.svg" alt="Kyro CMS" class="brand-logo logo-dark" />
          <img src="/logo.svg" alt="Kyro CMS" class="brand-logo logo-light" />
        </div>
        <span class="brand-text">Kyro CMS</span>
      </h1>
      
      <!-- Typewriter tagline -->
      <div class="tagline reveal-item" style="transition-delay: 0.2s">
        <span>{{ displayedTagline }}</span><span class="cursor" :class="{ blinking: typingComplete }">|</span>
      </div>
      
      <p class="description reveal-item" style="transition-delay: 0.3s">
        Stop writing boilerplate. Define your schema once in TypeScript and get
        REST, GraphQL, tRPC &amp; WebSocket APIs — plus a production-ready admin dashboard.
      </p>

      <!-- CTA Buttons -->
      <div class="actions reveal-item" style="transition-delay: 0.4s">
        <a href="/getting-started" class="btn btn-primary">Get Started</a>
        <a href="/architecture" class="btn btn-ghost">Learn the Architecture</a>
      </div>

      <!-- Terminal Pill -->
      <div class="terminal-pill reveal-item" style="transition-delay: 0.5s">
        <code class="terminal-code">
          <span class="t-prompt">▲</span>
          <span class="t-tilde">~</span>
          <span class="t-cmd">{{ command }}</span><span class="t-cursor" />
        </code>
        <button
          class="copy-btn"
          :class="{ 'is-copied': copied }"
          @click="copyCommand"
          :aria-label="copied ? 'Copied!' : 'Copy command to clipboard'"
          type="button"
        >
          <!-- Clipboard icon -->
          <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <!-- Check icon -->
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span class="copy-label">{{ copied ? 'Copied!' : '' }}</span>
        </button>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar reveal-item" style="transition-delay: 0.6s">
        <span class="stat"><span class="stat-number">{{ apiProtocolsVal }}</span> API Protocols</span>
        <span class="stat-dot" aria-hidden="true">·</span>
        <span class="stat"><span class="stat-number">{{ dbAdaptersVal }}</span> Database Adapters</span>
        <span class="stat-dot" aria-hidden="true">·</span>
        <span class="stat"><span class="stat-number">{{ fieldTypesVal }}+</span> Field Types</span>
      </div>

      <!-- Code Preview Card -->
      <div class="code-card reveal-item" style="transition-delay: 0.7s">
        <div class="code-card-bar">
          <div class="dots">
            <span class="dot dot-1" />
            <span class="dot dot-2" />
            <span class="dot dot-3" />
          </div>
          <span class="code-filename">kyro.config.ts</span>
        </div>
        <pre class="code-body"><code><span class="syn-kw">import</span> <span class="syn-punct">{</span> defineConfig <span class="syn-punct">}</span> <span class="syn-kw">from</span> <span class="syn-str">'@kyro-cms/core'</span><span class="syn-punct">;</span>

<span class="syn-kw">export default</span> <span class="syn-fn">defineConfig</span><span class="syn-punct">({</span>
  <span class="syn-prop">collections</span><span class="syn-punct">:</span> <span class="syn-punct">[{</span>
    <span class="syn-prop">slug</span><span class="syn-punct">:</span> <span class="syn-str">'posts'</span><span class="syn-punct">,</span>
    <span class="syn-prop">fields</span><span class="syn-punct">:</span> <span class="syn-punct">[</span>
      <span class="syn-punct">{</span> <span class="syn-prop">name</span><span class="syn-punct">:</span> <span class="syn-str">'title'</span><span class="syn-punct">,</span> <span class="syn-prop">type</span><span class="syn-punct">:</span> <span class="syn-str">'text'</span> <span class="syn-punct">},</span>
      <span class="syn-punct">{</span> <span class="syn-prop">name</span><span class="syn-punct">:</span> <span class="syn-str">'body'</span><span class="syn-punct">,</span>  <span class="syn-prop">type</span><span class="syn-punct">:</span> <span class="syn-str">'richtext'</span> <span class="syn-punct">},</span>
    <span class="syn-punct">]</span>
  <span class="syn-punct">}],</span>
  <span class="syn-prop">api</span><span class="syn-punct">:</span> <span class="syn-punct">{</span> <span class="syn-prop">rest</span><span class="syn-punct">:</span> <span class="syn-kw">true</span><span class="syn-punct">,</span> <span class="syn-prop">graphql</span><span class="syn-punct">:</span> <span class="syn-kw">true</span><span class="syn-punct">,</span> <span class="syn-prop">trpc</span><span class="syn-punct">:</span> <span class="syn-kw">true</span> <span class="syn-punct">},</span>
<span class="syn-punct">});</span></code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ============================================================
   ROOT LAYOUT & CONTAINER
   ============================================================ */
.hero-root {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  padding: 6rem 1.5rem 4rem;
  background: var(--k-bg-root);
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 1100px;
  width: 100%;
}

/* ============================================================
   PARTICLE CONSTELLATION & BACKGROUND ORBS
   ============================================================ */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform;
}

.orb-1 {
  width: 500px;
  height: 500px;
  top: -15%;
  left: -5%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  animation: drift-1 20s ease-in-out infinite alternate;
}
.orb-2 {
  width: 450px;
  height: 450px;
  top: 10%;
  right: -10%;
  background: radial-gradient(circle, rgba(200, 200, 200, 0.08) 0%, transparent 70%);
  animation: drift-2 24s ease-in-out infinite alternate;
}
.orb-3 {
  width: 400px;
  height: 400px;
  bottom: -10%;
  left: 20%;
  background: radial-gradient(circle, rgba(160, 160, 160, 0.07) 0%, transparent 70%);
  animation: drift-3 22s ease-in-out infinite alternate;
}
.orb-4 {
  width: 350px;
  height: 350px;
  bottom: 5%;
  right: 15%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
  animation: drift-4 26s ease-in-out infinite alternate;
}

@keyframes drift-1 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(50px, 30px) scale(1.1); }
}
@keyframes drift-2 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-40px, 40px) scale(1.08); }
}
@keyframes drift-3 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -30px) scale(1.15); }
}
@keyframes drift-4 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-20px, -30px) scale(1.04); }
}

/* Particle constellation */
.particle-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: var(--k-text-3);
  border-radius: 50%;
  opacity: 0.25;
  animation: float linear infinite;
  will-change: transform, opacity;
}

@keyframes float {
  0% {
    transform: translate(0, 0);
  }
  33% {
    transform: translate(25px, -35px);
    opacity: 0.5;
  }
  66% {
    transform: translate(-15px, 15px);
    opacity: 0.1;
  }
  100% {
    transform: translate(0, 0);
  }
}

/* Noise texture */
.noise-overlay {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 180px 180px;
}

/* ============================================================
   FLOATING VERSION BADGE
   ============================================================ */
.version-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  background: var(--k-bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--k-border);
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--k-text-2);
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: float-badge 4s ease-in-out infinite alternate;
  will-change: transform;
}

.version-badge:hover {
  border-color: var(--k-border-hover);
  color: var(--k-text-1);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--k-text-1);
  box-shadow: 0 0 6px var(--k-text-1);
}

@keyframes float-badge {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}

/* ============================================================
   THEME LOGO TOGGLING
   ============================================================ */
:root:not(.dark) .logo-dark {
  display: none !important;
}

:root.dark .logo-light {
  display: none !important;
}

/* ============================================================
   BRAND & LOGO WITH SPINNING RING
   ============================================================ */
.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  margin: 0;
}

.logo-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  height: 1.1em;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--k-border);
  flex-shrink: 0;
  box-sizing: border-box;
}

.logo-ring {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(255, 255, 255, 0.6) 0deg, rgba(255, 255, 255, 0.1) 120deg, rgba(255, 255, 255, 0.02) 240deg, rgba(255, 255, 255, 0.6) 360deg);
  mask: radial-gradient(circle, transparent 67%, black 68%);
  -webkit-mask: radial-gradient(circle, transparent 67%, black 68%);
  animation: spin 6s linear infinite;
  pointer-events: none;
  z-index: 0;
}

.brand-logo {
  width: 0.75em;
  height: 0.75em;
  color: var(--k-text-1);
  z-index: 1;
}

.brand-text {
  font-size: clamp(3rem, 8vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1;
  background: var(--k-gradient-brand-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================================
   TAGLINE & DESCRIPTION
   ============================================================ */
.tagline {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.15;
  color: var(--k-text-1);
  margin: 0.75rem 0 0;
  display: inline-flex;
  align-items: center;
}

.cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--k-text-1);
  font-weight: 300;
}

.cursor.blinking {
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  from, to { color: transparent }
  50% { color: var(--k-text-1) }
}

.description {
  font-size: 1.0625rem;
  line-height: 1.65;
  color: var(--k-text-2);
  max-width: 560px;
  margin: 1.25rem 0 0;
}

/* ============================================================
   CTA BUTTONS WITH SHIMMER
   ============================================================ */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: var(--vp-font-family-base);
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: transform var(--k-transition-medium) var(--k-ease-smooth),
              box-shadow var(--k-transition-medium) var(--k-ease-smooth),
              border-color var(--k-transition-fast) var(--k-ease-smooth),
              color var(--k-transition-fast) var(--k-ease-smooth);
}

.btn-primary {
  position: relative;
  overflow: hidden;
  background: var(--k-text-1);
  color: var(--k-bg-root);
  border: 1px solid var(--k-text-1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.btn-primary::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -60%;
  width: 40%;
  height: 200%;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0) 100%
  );
  transform: rotate(30deg);
  pointer-events: none;
  animation: shimmer 4s infinite linear;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
}

@keyframes shimmer {
  0% { left: -60%; }
  30% { left: 140%; }
  100% { left: 140%; }
}

.btn-ghost {
  background: transparent;
  color: var(--k-text-2);
  border: 1px solid var(--k-border);
}

.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: var(--k-border-hover);
  color: var(--k-text-1);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.1);
}

/* ============================================================
   TERMINAL PILL WITH COPY BUTTON
   ============================================================ */
.terminal-pill {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 2rem;
  background: var(--k-bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--k-border);
  border-radius: 12px;
  padding: 0.15rem 0.15rem 0.15rem 1.25rem;
  transition: border-color var(--k-transition-fast) var(--k-ease-smooth);
}

.terminal-pill:hover {
  border-color: var(--k-border-hover);
}

.terminal-code {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--k-text-3);
  user-select: all;
  white-space: nowrap;
}

.t-prompt {
  color: var(--k-text-1);
}
.t-tilde {
  color: var(--k-text-3);
}
.t-cmd {
  color: var(--k-text-2);
}

.t-cursor {
  display: inline-block;
  width: 6px;
  height: 10px;
  background: var(--k-text-2);
  margin-left: 2px;
  animation: blink-square 1s step-end infinite;
  vertical-align: middle;
}

@keyframes blink-square {
  from, to { opacity: 0 }
  50% { opacity: 1 }
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--k-bg-mute);
  border: 1px solid var(--k-border);
  border-radius: 8px;
  color: var(--k-text-3);
  padding: 0.5rem 0.65rem;
  margin-left: 0.75rem;
  cursor: pointer;
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  transition: color var(--k-transition-fast) var(--k-ease-smooth),
              border-color var(--k-transition-fast) var(--k-ease-smooth),
              background var(--k-transition-fast) var(--k-ease-smooth);
}

.copy-btn:hover {
  color: var(--k-text-1);
  border-color: var(--k-border-hover);
}

.copy-btn.is-copied {
  color: var(--k-text-1);
  border-color: var(--k-text-1);
  background: rgba(255, 255, 255, 0.08);
}

.copy-label {
  display: inline-block;
  min-width: 0;
}

/* ============================================================
   STATS BAR
   ============================================================ */
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 1.75rem;
}

.stat {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--k-text-3);
  letter-spacing: 0.01em;
}

.stat-number {
  color: var(--k-text-1);
  font-weight: 600;
}

.stat-dot {
  color: var(--k-text-3);
  font-size: 1rem;
  line-height: 1;
  opacity: 0.5;
}

/* ============================================================
   CODE PREVIEW CARD
   ============================================================ */
.code-card {
  margin-top: 2.5rem;
  width: 100%;
  max-width: 620px;
  border-radius: 14px;
  border: 1px solid var(--k-border);
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  text-align: left;
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

.code-card-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--k-border);
  background: rgba(255, 255, 255, 0.02);
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot-1 { background: rgba(255, 255, 255, 0.35); }
.dot-2 { background: rgba(255, 255, 255, 0.22); }
.dot-3 { background: rgba(255, 255, 255, 0.12); }

.code-filename {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--k-text-3);
  letter-spacing: 0.02em;
}

.code-body {
  margin: 0;
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8125rem;
  line-height: 1.75;
  color: var(--k-text-2);
}

.code-body code {
  font-family: inherit;
}

/* Syntax highlighting */
.syn-kw    { color: #ffffff; font-weight: 600; }
.syn-str   { color: #cccccc; }
.syn-prop  { color: #e1e1e1; }
.syn-fn    { color: #ffffff; }
.syn-punct { color: var(--k-text-3); }

/* ============================================================
   SCROLL REVEAL (INTERSECTION OBSERVER) EFFECT
   ============================================================ */
.reveal-item {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.reveal-item.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================================
   LIGHT MODE OVERRIDES
   ============================================================ */
:root:not(.dark) .hero-bg .orb-1 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.05) 0%, transparent 70%);
}
:root:not(.dark) .hero-bg .orb-2 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.04) 0%, transparent 70%);
}
:root:not(.dark) .hero-bg .orb-3 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.035) 0%, transparent 70%);
}
:root:not(.dark) .hero-bg .orb-4 {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.025) 0%, transparent 70%);
}

:root:not(.dark) .noise-overlay {
  opacity: 0.015;
}

:root:not(.dark) .version-badge {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
  color: var(--k-text-2);
}

:root:not(.dark) .version-badge:hover {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.12);
}

:root:not(.dark) .logo-wrapper {
  background: rgba(0, 0, 0, 0.01);
  border-color: rgba(0, 0, 0, 0.08);
}

:root:not(.dark) .logo-ring {
  background: conic-gradient(from 0deg, rgba(0, 0, 0, 0.4) 0deg, rgba(0, 0, 0, 0.08) 120deg, rgba(0, 0, 0, 0.01) 240deg, rgba(0, 0, 0, 0.4) 360deg);
}

:root:not(.dark) .btn-primary {
  background: #0e0f12;
  color: #f8f8f9;
  border-color: #0e0f12;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

:root:not(.dark) .btn-primary::after {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.25) 50%,
    rgba(255, 255, 255, 0) 100%
  );
}

:root:not(.dark) .btn-ghost {
  border-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.55);
}

:root:not(.dark) .btn-ghost:hover {
  border-color: rgba(0, 0, 0, 0.25);
  color: rgba(0, 0, 0, 0.85);
}

:root:not(.dark) .terminal-pill {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

:root:not(.dark) .terminal-pill:hover {
  border-color: rgba(0, 0, 0, 0.14);
}

:root:not(.dark) .copy-btn {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.06);
}

:root:not(.dark) .copy-btn:hover {
  border-color: rgba(0, 0, 0, 0.14);
}

:root:not(.dark) .copy-btn.is-copied {
  border-color: var(--k-text-1);
  background: rgba(0, 0, 0, 0.05);
}

:root:not(.dark) .code-card {
  background: rgba(245, 245, 245, 0.75);
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.02) inset;
}

:root:not(.dark) .code-card-bar {
  background: rgba(0, 0, 0, 0.02);
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

:root:not(.dark) .dot-1 { background: rgba(0, 0, 0, 0.3); }
:root:not(.dark) .dot-2 { background: rgba(0, 0, 0, 0.18); }
:root:not(.dark) .dot-3 { background: rgba(0, 0, 0, 0.1); }

:root:not(.dark) .syn-kw    { color: #000000; }
:root:not(.dark) .syn-str   { color: #444444; }
:root:not(.dark) .syn-prop  { color: #222222; }
:root:not(.dark) .syn-fn    { color: #000000; }

/* ============================================================
   RESPONSIVE LAYOUT
   ============================================================ */
@media (max-width: 768px) {
  .hero-root {
    padding: 4rem 1.25rem 3rem;
  }
  .orb { filter: blur(60px); }
  .orb-1 { width: 300px; height: 300px; }
  .orb-2 { width: 280px; height: 280px; }
  .orb-3 { width: 260px; height: 260px; }
  .orb-4 { width: 220px; height: 220px; }

  .code-card {
    max-width: 100%;
  }
  .code-body {
    font-size: 0.7rem;
    padding: 1rem;
  }
  .terminal-pill {
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.5rem;
    align-items: center;
  }
  .copy-btn {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
    width: 100%;
  }
  .btn {
    width: 100%;
  }
  .stats-bar {
    flex-direction: column;
    gap: 0.25rem;
  }
  .stat-dot {
    display: none;
  }
}

/* ============================================================
   REDUCED MOTION SUPPORT
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .orb {
    animation: none !important;
    transform: none !important;
  }
  .particle {
    animation: none !important;
    display: none;
  }
  .version-badge {
    animation: none !important;
    transform: none !important;
  }
  .logo-ring {
    animation: none !important;
    display: none;
  }
  .cursor {
    animation: none !important;
  }
  .btn-primary::after {
    animation: none !important;
    display: none;
  }
  .t-cursor {
    animation: none !important;
    opacity: 1 !important;
  }
  .reveal-item {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  .btn,
  .terminal-pill,
  .copy-btn {
    transition: none !important;
  }
}
</style>
