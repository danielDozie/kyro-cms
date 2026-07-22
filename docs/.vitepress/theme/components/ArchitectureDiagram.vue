<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const hoveredNode = ref(null)
const isVisible = ref(false)
const sectionRef = ref(null)

let observer = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        if (observer) {
          observer.unobserve(entry.target)
        }
      }
    })
  }, {
    threshold: 0.15
  })

  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

const nodes = {
  config: {
    label: 'kyro.config.ts',
    description: 'Single source of truth for your CMS',
    type: 'config',
  },
  server: {
    label: '@kyro/core',
    subtitle: 'Server',
    description: 'Node.js-only: DB drivers, auth, APIs',
    type: 'server',
  },
  client: {
    label: '@kyro/core/client',
    subtitle: 'Client',
    description: '100% browser-safe: types & utilities',
    type: 'client',
  },
  serverExports: {
    label: 'Server Exports',
    items: ['REST', 'GraphQL', 'tRPC', 'WS', 'DB', 'Auth'],
    description: 'Full backend capabilities at your disposal',
    type: 'server',
  },
  clientExports: {
    label: 'Client Exports',
    items: ['Types', 'Styles', 'Helpers'],
    description: 'Tree-shakeable, zero server leakage',
    type: 'client',
  },
}

const tooltipPos = computed(() => {
  if (!hoveredNode.value) return { x: 0, y: 0 }

  const positions = {
    config:        { x: 350, y: 30 },
    server:        { x: 175, y: 160 },
    client:        { x: 525, y: 160 },
    serverExports: { x: 175, y: 290 },
    clientExports: { x: 525, y: 290 },
  }
  return positions[hoveredNode.value] || { x: 0, y: 0 }
})

const tooltipText = computed(() => {
  if (!hoveredNode.value) return ''
  return nodes[hoveredNode.value]?.description || ''
})

function onHover(nodeKey) {
  hoveredNode.value = nodeKey
}

function onLeave() {
  hoveredNode.value = null
}
</script>

<template>
  <section
    class="architecture-section"
    :class="{ 'is-visible': isVisible }"
    ref="sectionRef"
  >
    <!-- Section header rendered by parent (DocsHome) -->

    <div class="diagram-wrapper">
      <svg
        viewBox="0 0 700 440"
        xmlns="http://www.w3.org/2000/svg"
        class="architecture-svg"
        role="img"
        aria-label="Kyro CMS architecture diagram showing how kyro.config.ts splits into server and client exports"
      >
        <defs>
          <!-- Gradient for config box border -->
          <linearGradient id="configGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#a1a1a1" />
            <stop offset="100%" stop-color="#666666" />
          </linearGradient>

          <!-- Subtle indigo tint for server boxes -->
          <linearGradient id="serverFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.06)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
          </linearGradient>

          <!-- Subtle violet tint for client boxes -->
          <linearGradient id="clientFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.01)" />
          </linearGradient>

          <!-- Glow filters -->
          <filter id="glowConfig" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feFlood flood-opacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glowServer" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feFlood flood-opacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glowClient" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feFlood flood-opacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Standard filter particleGlow -->
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood flood-opacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Animated dash pattern for lines -->
          <pattern id="dotPattern" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--k-text-3)" />
          </pattern>
        </defs>

        <!-- ===================== CONNECTION LINES ===================== -->

        <!-- Config → Server (fork left) -->
        <path
          id="path-config-server"
          d="M 350 82 L 350 110 Q 350 120 340 120 L 195 120 Q 185 120 185 130 L 185 150"
          fill="none"
          stroke="var(--k-border-hover)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          class="connection-line"
        />

        <!-- Config → Client (fork right) -->
        <path
          id="path-config-client"
          d="M 350 82 L 350 110 Q 350 120 360 120 L 505 120 Q 515 120 515 130 L 515 150"
          fill="none"
          stroke="var(--k-border-hover)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          class="connection-line"
        />

        <!-- Fork junction dot -->
        <circle cx="350" cy="110" r="3" fill="var(--k-text-3)" class="junction-dot" />

        <!-- Server → Server Exports -->
        <path
          id="path-server-exports"
          d="M 185 230 L 185 270"
          fill="none"
          stroke="var(--k-border-hover)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          class="connection-line"
        />

        <!-- Client → Client Exports -->
        <path
          id="path-client-exports"
          d="M 515 230 L 515 270"
          fill="none"
          stroke="var(--k-border-hover)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          class="connection-line"
        />

        <!-- Arrow heads -->
        <!-- Server arrow -->
        <polygon points="185,148 180,140 190,140" fill="var(--k-text-3)" class="arrow-head" />
        <!-- Client arrow -->
        <polygon points="515,148 510,140 520,140" fill="var(--k-text-3)" class="arrow-head" />
        <!-- Server exports arrow -->
        <polygon points="185,268 180,260 190,260" fill="var(--k-text-3)" class="arrow-head" />
        <!-- Client exports arrow -->
        <polygon points="515,268 510,260 520,260" fill="var(--k-text-3)" class="arrow-head" />

        <!-- ===================== PARTICLES ===================== -->
        <g class="particles-group" v-if="isVisible">
          <!-- Config → Server particles -->
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" repeatCount="indefinite">
              <mpath href="#path-config-server" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite">
              <mpath href="#path-config-server" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite">
              <mpath href="#path-config-server" />
            </animateMotion>
          </circle>

          <!-- Config → Client particles -->
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" repeatCount="indefinite">
              <mpath href="#path-config-client" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite">
              <mpath href="#path-config-client" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite">
              <mpath href="#path-config-client" />
            </animateMotion>
          </circle>

          <!-- Server → Server Exports particles -->
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="1.8s" repeatCount="indefinite">
              <mpath href="#path-server-exports" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite">
              <mpath href="#path-server-exports" />
            </animateMotion>
          </circle>

          <!-- Client → Client Exports particles -->
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="1.8s" repeatCount="indefinite">
              <mpath href="#path-client-exports" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#ffffff" opacity="0.8" filter="url(#particleGlow)" class="flow-particle">
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite">
              <mpath href="#path-client-exports" />
            </animateMotion>
          </circle>
        </g>

        <!-- ===================== CONFIG BOX ===================== -->
        <g
          class="node-group node-group-config"
          :class="{ hovered: hoveredNode === 'config' }"
          @mouseenter="onHover('config')"
          @mouseleave="onLeave"
          :filter="hoveredNode === 'config' ? 'url(#glowConfig)' : ''"
        >
          <!-- Gradient border (drawn as a slightly larger rect behind) -->
          <rect
            x="237" y="37" width="226" height="48" rx="12"
            fill="url(#configGradient)"
          />
          <!-- Inner fill -->
          <rect
            x="239" y="39" width="222" height="44" rx="11"
            class="box-bg"
          />
          <!-- File icon -->
          <text x="275" y="66" class="icon-text" font-size="14">⚙</text>
          <!-- Label -->
          <text x="295" y="66" class="mono-label" font-size="13.5">
            kyro.config.ts
          </text>
        </g>


        <!-- ===================== SERVER BOX ===================== -->
        <g
          class="node-group node-group-server"
          :class="{ hovered: hoveredNode === 'server' }"
          @mouseenter="onHover('server')"
          @mouseleave="onLeave"
          :filter="hoveredNode === 'server' ? 'url(#glowServer)' : ''"
        >
          <rect
            x="105" y="150" width="160" height="78" rx="10"
            fill="url(#serverFill)"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1"
            class="box-stroke"
          />
          <text x="185" y="174" text-anchor="middle" class="box-subtitle" font-size="10">
            SERVER
          </text>
          <text x="185" y="194" text-anchor="middle" class="box-title" font-size="13">
            @kyro/core
          </text>
          <text x="185" y="214" text-anchor="middle" class="box-detail" font-size="10.5">
            Node.js runtime
          </text>
        </g>


        <!-- ===================== CLIENT BOX ===================== -->
        <g
          class="node-group node-group-client"
          :class="{ hovered: hoveredNode === 'client' }"
          @mouseenter="onHover('client')"
          @mouseleave="onLeave"
          :filter="hoveredNode === 'client' ? 'url(#glowClient)' : ''"
        >
          <rect
            x="435" y="150" width="160" height="78" rx="10"
            fill="url(#clientFill)"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1"
            class="box-stroke"
          />
          <text x="515" y="174" text-anchor="middle" class="box-subtitle" font-size="10">
            CLIENT
          </text>
          <text x="515" y="194" text-anchor="middle" class="box-title" font-size="13">
            @kyro/core/client
          </text>
          <text x="515" y="214" text-anchor="middle" class="box-detail" font-size="10.5">
            Browser-safe
          </text>
        </g>


        <!-- ===================== SERVER EXPORTS BOX ===================== -->
        <g
          class="node-group node-group-serverExports"
          :class="{ hovered: hoveredNode === 'serverExports' }"
          @mouseenter="onHover('serverExports')"
          @mouseleave="onLeave"
          :filter="hoveredNode === 'serverExports' ? 'url(#glowServer)' : ''"
        >
          <rect
            x="105" y="270" width="160" height="140" rx="10"
            fill="url(#serverFill)"
            stroke="rgba(255,255,255,0.08)"
            stroke-width="1"
            class="box-stroke"
          />
          <!-- Items list -->
          <text x="130" y="296" class="export-item" font-size="11.5">
            <tspan>▸</tspan> REST
          </text>
          <text x="130" y="316" class="export-item" font-size="11.5">
            <tspan>▸</tspan> GraphQL
          </text>
          <text x="130" y="336" class="export-item" font-size="11.5">
            <tspan>▸</tspan> tRPC
          </text>
          <text x="130" y="356" class="export-item" font-size="11.5">
            <tspan>▸</tspan> WebSocket
          </text>
          <text x="130" y="376" class="export-item" font-size="11.5">
            <tspan>▸</tspan> Database
          </text>
          <text x="130" y="396" class="export-item" font-size="11.5">
            <tspan>▸</tspan> Auth
          </text>
        </g>


        <!-- ===================== CLIENT EXPORTS BOX ===================== -->
        <g
          class="node-group node-group-clientExports"
          :class="{ hovered: hoveredNode === 'clientExports' }"
          @mouseenter="onHover('clientExports')"
          @mouseleave="onLeave"
          :filter="hoveredNode === 'clientExports' ? 'url(#glowClient)' : ''"
        >
          <rect
            x="435" y="270" width="160" height="100" rx="10"
            fill="url(#clientFill)"
            stroke="rgba(255,255,255,0.08)"
            stroke-width="1"
            class="box-stroke"
          />
          <text x="460" y="296" class="export-item" font-size="11.5">
            <tspan>▸</tspan> Types
          </text>
          <text x="460" y="316" class="export-item" font-size="11.5">
            <tspan>▸</tspan> Styles
          </text>
          <text x="460" y="336" class="export-item" font-size="11.5">
            <tspan>▸</tspan> Helpers
          </text>
        </g>


        <!-- ===================== HOVER TOOLTIP ===================== -->
        <g
          v-if="hoveredNode"
          class="tooltip-group"
          :transform="`translate(${tooltipPos.x}, ${tooltipPos.y})`"
        >
          <rect
            :x="-tooltipText.length * 3.3"
            y="-18"
            :width="tooltipText.length * 6.6"
            height="24"
            rx="6"
            class="tooltip-bg"
          />
          <text
            x="0" y="-2"
            text-anchor="middle"
            class="tooltip-text"
            font-size="11"
          >
            {{ tooltipText }}
          </text>
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped>
/* ── Section wrapper ── */
.architecture-section {
  width: 100%;
  max-width: 756px;
  margin: 0 auto;
  padding: 2rem 2rem 5rem;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.8s var(--k-ease-smooth), transform 0.8s var(--k-ease-smooth);
  will-change: opacity, transform;
  --k-glow-color: rgba(255, 255, 255, 0.65);
}

.architecture-section.is-visible {
  opacity: 1;
  transform: scale(1);
}

/* ── Glow filters color targeting ── */
#glowConfig feFlood,
#glowServer feFlood,
#glowClient feFlood,
#particleGlow feFlood {
  flood-color: var(--k-glow-color, #ffffff);
}

/* ── Header ── */
.architecture-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.architecture-title {
  font-family: var(--vp-font-family-base);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.2;
  color: var(--k-text-1);
  margin: 0 0 0.5rem;
}

.architecture-subtitle {
  font-family: var(--vp-font-family-base);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: var(--k-text-2);
  margin: 0;
}

/* ── Diagram container ── */
.diagram-wrapper {
  max-width: 100%;
  margin: 0 auto;
}

.architecture-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* ── Box backgrounds ── */
.box-bg {
  fill: var(--k-bg-mute);
}

.box-stroke {
  transition: stroke 0.25s ease;
}

/* ── Text styles ── */
.mono-label {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  fill: var(--k-text-1);
}

.icon-text {
  font-size: 14px;
}

.box-subtitle {
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  fill: var(--k-text-3);
}

.box-title {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  fill: var(--k-text-1);
}

.box-detail {
  font-family: var(--vp-font-family-base);
  font-weight: 400;
  fill: var(--k-text-3);
}

.export-item {
  font-family: var(--vp-font-family-mono);
  font-weight: 500;
  fill: var(--k-text-2);
}

.export-item tspan {
  fill: var(--k-text-3);
  font-size: 9px;
}

/* ── Connection line animation ── */
.connection-line {
  animation: dash-flow 1.8s linear infinite;
}

@keyframes dash-flow {
  to {
    stroke-dashoffset: -20;
  }
}

.junction-dot {
  animation: dot-pulse 2.5s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.arrow-head {
  opacity: 0.6;
}

/* ── Node entrance & hover states ── */
.node-group {
  cursor: pointer;
  opacity: 0;
  transform: translateY(15px);
  transition: 
    opacity 0.6s var(--k-ease-smooth), 
    transform 0.6s var(--k-ease-smooth),
    stroke-width 0.25s ease,
    fill 0.25s ease;
}

.architecture-section.is-visible .node-group {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered transition delays for entrance */
.architecture-section.is-visible .node-group-config {
  transition-delay: 0.1s;
}

.architecture-section.is-visible .node-group-server {
  transition-delay: 0.25s;
}

.architecture-section.is-visible .node-group-client {
  transition-delay: 0.4s;
}

.architecture-section.is-visible .node-group-serverExports {
  transition-delay: 0.55s;
}

.architecture-section.is-visible .node-group-clientExports {
  transition-delay: 0.7s;
}

.node-group.hovered .box-stroke {
  stroke-width: 1.5;
}

.node-group.hovered .box-title,
.node-group.hovered .mono-label {
  fill: var(--k-text-1);
}

.node-group.hovered .export-item {
  fill: var(--k-text-1);
}

/* ── Tooltip ── */
.tooltip-group {
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease-out;
}

.tooltip-bg {
  fill: var(--k-bg-elv);
  stroke: var(--k-border-hover);
  stroke-width: 1;
}

.tooltip-text {
  font-family: var(--vp-font-family-base);
  font-weight: 500;
  fill: var(--k-text-1);
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .architecture-section {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  .node-group {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    transition-delay: 0s !important;
  }

  .flow-particle {
    display: none !important;
  }

  .connection-line {
    animation: none !important;
  }

  .junction-dot {
    animation: none !important;
    opacity: 0.7;
  }

  .tooltip-group {
    animation: none !important;
  }

  .node-group {
    transition: none !important;
  }

  .box-stroke {
    transition: none !important;
  }
}

/* ── Light mode adjustments ── */
:root:not(.dark) .architecture-section {
  --k-glow-color: rgba(0, 0, 0, 0.15);
}

:root:not(.dark) .box-bg {
  fill: var(--k-bg-mute);
}

:root:not(.dark) .tooltip-bg {
  fill: var(--k-bg-elv);
  stroke: var(--k-border);
}

:root:not(.dark) .arrow-head {
  fill: var(--k-text-3);
}

:root:not(.dark) .box-stroke {
  stroke: rgba(0, 0, 0, 0.1);
}

:root:not(.dark) #serverFill stop {
  stop-color: rgba(0, 0, 0, 0.03);
}

:root:not(.dark) #clientFill stop {
  stop-color: rgba(0, 0, 0, 0.02);
}

:root:not(.dark) #configGradient stop:nth-child(1) {
  stop-color: #333333;
}

:root:not(.dark) #configGradient stop:nth-child(2) {
  stop-color: #666666;
}

:root:not(.dark) #configGradient stop:nth-child(3) {
  stop-color: #999999;
}
</style>
