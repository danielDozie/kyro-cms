<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const sectionRef = ref(null)
let observer = null

onMounted(() => {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          observer?.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.05,
      rootMargin: '100px 0px'
    })
    
    if (sectionRef.value) {
      observer.observe(sectionRef.value)
    }
  } else {
    isVisible.value = true
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Generate a random string to make mask IDs unique and avoid collisions across pages
const componentId = typeof Math !== 'undefined' ? Math.random().toString(36).substring(2, 9) : 'marquee'

const logos = [
  { name: 'Astro', id: 'astro' },
  { name: 'PostgreSQL', id: 'postgresql' },
  { name: 'MongoDB', id: 'mongodb' },
  { name: 'GraphQL', id: 'graphql' },
  { name: 'TypeScript', id: 'typescript' },
  { name: 'React', id: 'react' },
  { name: 'Vue', id: 'vue' },
  { name: 'Node.js', id: 'nodejs' },
  { name: 'SQLite', id: 'sqlite' },
  { name: 'Docker', id: 'docker' }
]
</script>

<template>
  <section 
    ref="sectionRef" 
    class="logo-marquee-section" 
    :class="{ visible: isVisible }"
    aria-label="Technology Stack Integrations"
  >
    <!-- Reusable SVG Masks to ensure complete monochrome currentColor compatibility -->
    <svg width="0" height="0" style="position: absolute; pointer-events: none;" aria-hidden="true">
      <defs>
        <!-- PostgreSQL Mask (cuts out eyes and mouth) -->
        <mask :id="`pg-mask-${componentId}`">
          <rect width="48" height="48" fill="white" />
          <circle cx="20" cy="18" r="2.5" fill="black" />
          <circle cx="28" cy="18" r="2.5" fill="black" />
          <path d="M20 24c0 1.5 1.8 3 4 3s4-1.5 4-3" stroke="black" stroke-width="2.5" stroke-linecap="round" fill="none" />
        </mask>

        <!-- MongoDB Mask (cuts out leaf spine/crease) -->
        <mask :id="`mongo-mask-${componentId}`">
          <rect width="48" height="48" fill="white" />
          <path d="M24 10v20" stroke="black" stroke-width="2.5" stroke-linecap="round" />
        </mask>

        <!-- TypeScript Mask (cuts out letters T and S) -->
        <mask :id="`ts-mask-${componentId}`">
          <rect width="48" height="48" fill="white" rx="6" />
          <path d="M12 18h12v3h-4.5v13h-3V21H12v-3z" fill="black" />
          <path d="M29 34c2.8 0 5-1.5 5-4.2s-2.2-3.8-4.5-4.3c-1.8-.4-2.5-.8-2.5-1.5s.8-1.2 1.8-1.2c1.2 0 2 .5 2.5 1.5l2.2-1.5C32.8 20.3 31 19 28.8 19c-2.5 0-4.8 1.5-4.8 4s2 3.5 4.5 4c1.8.4 2.5.8 2.5 1.5s-.8 1.5-2 1.5c-1.5 0-2.5-.8-3-1.8l-2.2 1.5c1 1.8 2.8 2.8 5.2 2.8z" fill="black" />
        </mask>

        <!-- Vue Mask (cuts out inner V chevron) -->
        <mask :id="`vue-mask-${componentId}`">
          <rect width="48" height="48" fill="white" />
          <path d="M24 28l10-18h-6l-4 7-4-7h-6l10 18z" fill="black" />
        </mask>

        <!-- Node.js Mask (cuts out left hexagon inner division) -->
        <mask :id="`node-mask-${componentId}`">
          <rect width="48" height="48" fill="white" />
          <path d="M22 11v26L11 31V17l11-6z" fill="black" />
        </mask>
      </defs>
    </svg>

    <!-- Section header rendered by parent (DocsHome) -->

    <div class="marquee-container">
      <div class="marquee-track">
        <!-- Main items -->
        <div class="marquee-content">
          <div v-for="logo in logos" :key="logo.name" class="logo-card">
            <div class="logo-icon">
              <!-- Astro -->
              <svg v-if="logo.id === 'astro'" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22h4.25l2.25-5.5h7l2.25 5.5H22L12 2zm1.25 11h-2.5L12 9.5 13.25 13z"/>
              </svg>

              <!-- PostgreSQL -->
              <svg v-else-if="logo.id === 'postgresql'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M33 10c-2-3-5.5-4-9-4s-7 1.5-9 4c-2.5 3-3.5 7-3 11 .5 4 2 7.5 4.5 10 1.5 1.5 3 2.5 4.5 3l1 5c.2.8.8 1 1.5 1h1c.7 0 1.3-.2 1.5-1l1-5c1.5-.5 3-1.5 4.5-3 2.5-2.5 4-6 4.5-10 .5-4-.5-8-3-11z" fill="currentColor" :mask="`url(#pg-mask-${componentId})`"/>
              </svg>

              <!-- MongoDB -->
              <svg v-else-if="logo.id === 'mongodb'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6c-1 4-3 7-5 10-2.5 3.5-4 7-4 11 0 5 3 9 7.5 11 .5.2 1 .3 1.5.3s1-.1 1.5-.3C30 36 33 32 33 27c0-4-1.5-7.5-4-11-2-3-4-6-5-10z" fill="currentColor" :mask="`url(#mongo-mask-${componentId})`"/>
                <path d="M24 38v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
              </svg>

              <!-- GraphQL -->
              <svg v-else-if="logo.id === 'graphql'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="24,6 38,14 38,30 24,38 10,30 10,14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <polygon points="24,14 31,18 31,26 24,30 17,26 17,18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/>
                <circle cx="24" cy="6" r="3.5" fill="currentColor"/>
                <circle cx="38" cy="14" r="3.5" fill="currentColor"/>
                <circle cx="38" cy="30" r="3.5" fill="currentColor"/>
                <circle cx="24" cy="38" r="3.5" fill="currentColor"/>
                <circle cx="10" cy="30" r="3.5" fill="currentColor"/>
                <circle cx="10" cy="14" r="3.5" fill="currentColor"/>
              </svg>

              <!-- TypeScript -->
              <svg v-else-if="logo.id === 'typescript'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="6" fill="currentColor" :mask="`url(#ts-mask-${componentId})`" />
              </svg>

              <!-- React -->
              <svg v-else-if="logo.id === 'react'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="3.5" fill="currentColor"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(30 24 24)" stroke="currentColor" stroke-width="2.5"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(90 24 24)" stroke="currentColor" stroke-width="2.5"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(150 24 24)" stroke="currentColor" stroke-width="2.5"/>
              </svg>

              <!-- Vue -->
              <svg v-else-if="logo.id === 'vue'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 38L41 8H31l-7 12-7-12H7l17 30z" fill="currentColor" :mask="`url(#vue-mask-${componentId})`"/>
              </svg>

              <!-- Node.js -->
              <svg v-else-if="logo.id === 'nodejs'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4c-.6 0-1.2.3-1.6.6L7.6 13.8c-.4.3-.6.8-.6 1.3v17.8c0 .5.2 1 .6 1.3l14.8 9.2c.4.3 1 .3 1.6 0l14.8-9.2c.4-.3.6-.8.6-1.3V15.1c0-.5-.2-1-.6-1.3L24 4.6c-.4-.3-1-.6-1.6-.6z" fill="currentColor" :mask="`url(#node-mask-${componentId})`"/>
              </svg>

              <!-- SQLite -->
              <svg v-else-if="logo.id === 'sqlite'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6c-9.9 0-18 3.1-18 7s8.1 7 18 7 18-3.1 18-7-8.1-7-18-7zm0 10c-7.7 0-14-2.2-14-4.5S16.3 7 24 7s14 2.2 14 4.5-6.3 4.5-14 4.5z" fill="currentColor"/>
                <path d="M6 13v11c0 3.9 8.1 7 18 7s18-3.1 18-7V13c0 3.9-8.1 7-18 7S6 16.9 6 13z" fill="currentColor" opacity="0.75"/>
                <path d="M6 24v11c0 3.9 8.1 7 18 7s18-3.1 18-7V24c0 3.9-8.1 7-18 7S6 27.9 6 24z" fill="currentColor" opacity="0.5"/>
              </svg>

              <!-- Docker -->
              <svg v-else-if="logo.id === 'docker'" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.2 8.4h2.4v2.4h-2.4zm-3.6 0h2.4v2.4H9.6zm3.6-3.6h2.4v2.4h-2.4zM9.6 4.8h2.4v2.4H9.6zm3.6 7.2h2.4v2.4h-2.4zm-3.6 0h2.4v2.4H9.6zm-3.6 0h2.4v2.4H6zm0-3.6h2.4v2.4H6zm-3.6 3.6h2.4v2.4H2.4zm21-3.6c-.2-.1-.5-.2-.8-.2h-1c-.5 0-.9.2-1.2.5-.4.5-.8 1.1-1.3 1.7-.5.6-1.1 1.2-1.8 1.6-1.1.7-2.3 1.1-3.6 1.1H1.2c-.6 0-1.1.4-1.2 1-.1.6.3 1.2.9 1.3 1.5.3 3 .8 4.4 1.6.8.5 1.7 1.1 2.7 1.8 1.1.7 2.3 1.2 3.6 1.4.6.1 1.2.1 1.8.1 3.5 0 6.8-1.5 9-4.1.8-1 1.5-2.2 2-3.5.3-.8.4-1.7.4-2.6 0-.3-.1-.6-.2-.8z"/>
              </svg>
            </div>
            <span class="logo-name">{{ logo.name }}</span>
          </div>
        </div>

        <!-- Cloned items for infinite scrolling loop -->
        <div class="marquee-content" aria-hidden="true">
          <div v-for="logo in logos" :key="`${logo.name}-clone`" class="logo-card">
            <div class="logo-icon">
              <!-- Astro -->
              <svg v-if="logo.id === 'astro'" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22h4.25l2.25-5.5h7l2.25 5.5H22L12 2zm1.25 11h-2.5L12 9.5 13.25 13z"/>
              </svg>

              <!-- PostgreSQL -->
              <svg v-else-if="logo.id === 'postgresql'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M33 10c-2-3-5.5-4-9-4s-7 1.5-9 4c-2.5 3-3.5 7-3 11 .5 4 2 7.5 4.5 10 1.5 1.5 3 2.5 4.5 3l1 5c.2.8.8 1 1.5 1h1c.7 0 1.3-.2 1.5-1l1-5c1.5-.5 3-1.5 4.5-3 2.5-2.5 4-6 4.5-10 .5-4-.5-8-3-11z" fill="currentColor" :mask="`url(#pg-mask-${componentId})`"/>
              </svg>

              <!-- MongoDB -->
              <svg v-else-if="logo.id === 'mongodb'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6c-1 4-3 7-5 10-2.5 3.5-4 7-4 11 0 5 3 9 7.5 11 .5.2 1 .3 1.5.3s1-.1 1.5-.3C30 36 33 32 33 27c0-4-1.5-7.5-4-11-2-3-4-6-5-10z" fill="currentColor" :mask="`url(#mongo-mask-${componentId})`"/>
                <path d="M24 38v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
              </svg>

              <!-- GraphQL -->
              <svg v-else-if="logo.id === 'graphql'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="24,6 38,14 38,30 24,38 10,30 10,14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <polygon points="24,14 31,18 31,26 24,30 17,26 17,18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/>
                <circle cx="24" cy="6" r="3.5" fill="currentColor"/>
                <circle cx="38" cy="14" r="3.5" fill="currentColor"/>
                <circle cx="38" cy="30" r="3.5" fill="currentColor"/>
                <circle cx="24" cy="38" r="3.5" fill="currentColor"/>
                <circle cx="10" cy="30" r="3.5" fill="currentColor"/>
                <circle cx="10" cy="14" r="3.5" fill="currentColor"/>
              </svg>

              <!-- TypeScript -->
              <svg v-else-if="logo.id === 'typescript'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="6" fill="currentColor" :mask="`url(#ts-mask-${componentId})`" />
              </svg>

              <!-- React -->
              <svg v-else-if="logo.id === 'react'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="3.5" fill="currentColor"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(30 24 24)" stroke="currentColor" stroke-width="2.5"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(90 24 24)" stroke="currentColor" stroke-width="2.5"/>
                <ellipse cx="24" cy="24" rx="7" ry="20" transform="rotate(150 24 24)" stroke="currentColor" stroke-width="2.5"/>
              </svg>

              <!-- Vue -->
              <svg v-else-if="logo.id === 'vue'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 38L41 8H31l-7 12-7-12H7l17 30z" fill="currentColor" :mask="`url(#vue-mask-${componentId})`"/>
              </svg>

              <!-- Node.js -->
              <svg v-else-if="logo.id === 'nodejs'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4c-.6 0-1.2.3-1.6.6L7.6 13.8c-.4.3-.6.8-.6 1.3v17.8c0 .5.2 1 .6 1.3l14.8 9.2c.4.3 1 .3 1.6 0l14.8-9.2c.4-.3.6-.8.6-1.3V15.1c0-.5-.2-1-.6-1.3L24 4.6c-.4-.3-1-.6-1.6-.6z" fill="currentColor" :mask="`url(#node-mask-${componentId})`"/>
              </svg>

              <!-- SQLite -->
              <svg v-else-if="logo.id === 'sqlite'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6c-9.9 0-18 3.1-18 7s8.1 7 18 7 18-3.1 18-7-8.1-7-18-7zm0 10c-7.7 0-14-2.2-14-4.5S16.3 7 24 7s14 2.2 14 4.5-6.3 4.5-14 4.5z" fill="currentColor"/>
                <path d="M6 13v11c0 3.9 8.1 7 18 7s18-3.1 18-7V13c0 3.9-8.1 7-18 7S6 16.9 6 13z" fill="currentColor" opacity="0.75"/>
                <path d="M6 24v11c0 3.9 8.1 7 18 7s18-3.1 18-7V24c0 3.9-8.1 7-18 7S6 27.9 6 24z" fill="currentColor" opacity="0.5"/>
              </svg>

              <!-- Docker -->
              <svg v-else-if="logo.id === 'docker'" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.2 8.4h2.4v2.4h-2.4zm-3.6 0h2.4v2.4H9.6zm3.6-3.6h2.4v2.4h-2.4zM9.6 4.8h2.4v2.4H9.6zm3.6 7.2h2.4v2.4h-2.4zm-3.6 0h2.4v2.4H9.6zm-3.6 0h2.4v2.4H6zm0-3.6h2.4v2.4H6zm-3.6 3.6h2.4v2.4H2.4zm21-3.6c-.2-.1-.5-.2-.8-.2h-1c-.5 0-.9.2-1.2.5-.4.5-.8 1.1-1.3 1.7-.5.6-1.1 1.2-1.8 1.6-1.1.7-2.3 1.1-3.6 1.1H1.2c-.6 0-1.1.4-1.2 1-.1.6.3 1.2.9 1.3 1.5.3 3 .8 4.4 1.6.8.5 1.7 1.1 2.7 1.8 1.1.7 2.3 1.2 3.6 1.4.6.1 1.2.1 1.8.1 3.5 0 6.8-1.5 9-4.1.8-1 1.5-2.2 2-3.5.3-.8.4-1.7.4-2.6 0-.3-.1-.6-.2-.8z"/>
              </svg>
            </div>
            <span class="logo-name">{{ logo.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.logo-marquee-section {
  padding: 4rem 0 3.5rem;
  width: 100%;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: 
    opacity var(--k-transition-slow),
    transform var(--k-transition-slow);
}

.logo-marquee-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.logo-marquee-header {
  text-align: left;
  margin-bottom: 2.5rem;
  padding: 0 2rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.logo-marquee-title {
  font-family: var(--vp-font-family-base);
  font-size: clamp(1.5rem, 3.5vw, 2.25rem);
  font-weight: 700;
  color: var(--k-text-1);
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
  line-height: 1.2;
}

.logo-marquee-subtitle {
  font-family: var(--vp-font-family-base);
  font-size: 0.9375rem;
  color: var(--k-text-2);
  max-width: 500px;
  line-height: 1.65;
}

/* Marquee Container with edge-fade mask */
.marquee-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  padding: 1rem 0;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}

/* Scrolling track */
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee-scroll 40s linear infinite;
}

.marquee-container:hover .marquee-track {
  animation-play-state: paused;
}

.marquee-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-right: 1.5rem; /* Match gap to ensure seamless loop spacing */
}

/* Card item */
.logo-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  min-width: 155px;
  transition: 
    border-color var(--k-transition-fast), 
    background var(--k-transition-fast), 
    transform var(--k-transition-medium);
  cursor: default;
  will-change: transform;
}

.logo-card:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

/* Icon wrapper */
.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.4);
  transition: color var(--k-transition-fast);
  filter: grayscale(100%);
}

.logo-icon svg {
  width: 24px;
  height: 24px;
  display: block;
}

.logo-card:hover .logo-icon {
  color: rgba(255, 255, 255, 0.85);
  filter: grayscale(0%);
}

/* Typography */
.logo-name {
  font-family: var(--vp-font-family-base);
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  transition: color var(--k-transition-fast);
}

.logo-card:hover .logo-name {
  color: rgba(255, 255, 255, 0.8);
}

/* Light mode adjustments */
:root:not(.dark) .logo-card {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.06);
}

:root:not(.dark) .logo-card:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.14);
}

:root:not(.dark) .logo-icon {
  color: rgba(0, 0, 0, 0.3);
}

:root:not(.dark) .logo-card:hover .logo-icon {
  color: rgba(0, 0, 0, 0.7);
}

:root:not(.dark) .logo-name {
  color: rgba(0, 0, 0, 0.35);
}

:root:not(.dark) .logo-card:hover .logo-name {
  color: rgba(0, 0, 0, 0.75);
}

/* Scroll animation keyframes */
@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

/* ────────────────────────────────────────────────────────────────
   REDUCED MOTION & STATIC FALLBACK
   ──────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .logo-marquee-section {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  
  .marquee-container {
    mask-image: none;
    -webkit-mask-image: none;
    overflow: visible;
    padding: 0;
  }
  
  .marquee-track {
    animation: none !important;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    width: 100%;
  }
  
  .marquee-content {
    display: contents;
  }
  
  /* Hide duplicated content completely */
  .marquee-content[aria-hidden="true"] {
    display: none;
  }
  
  .logo-card {
    min-width: auto;
    justify-content: center;
    transform: none !important;
    transition: none !important;
  }
}

@media (prefers-reduced-motion: reduce) and (min-width: 640px) {
  .marquee-track {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) and (min-width: 768px) {
  .marquee-track {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>