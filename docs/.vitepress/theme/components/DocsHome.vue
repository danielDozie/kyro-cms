<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import pkg from '../../../../package.json'
import LogoMarquee from './LogoMarquee.vue'
import ArchitectureDiagram from './ArchitectureDiagram.vue'

const versionText = `v${pkg.version} — What's new`

/* ── State ── */
const mounted = ref(false)
const scrollY = ref(0)
const parallaxRef = ref(null)
const parallaxProgress = ref(0)
const archParallaxRef = ref(null)
const archParallaxProgress = ref(0)
const copied = ref(false)
const command = 'npm create kyro@latest'
const activeTab = ref('rest')

/* ── Helpers ── */
function copyCommand() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(command).then(() => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 1800)
    })
  }
}

/* ── Lifecycle ── */
let revealObserver = null

onMounted(() => {
  mounted.value = true

  window.addEventListener('scroll', () => {
    scrollY.value = window.scrollY
    const viewH = window.innerHeight
    if (parallaxRef.value) {
      const rect = parallaxRef.value.getBoundingClientRect()
      parallaxProgress.value = Math.max(0, (viewH - rect.top) / (viewH + rect.height))
    }
    if (archParallaxRef.value) {
      const rect = archParallaxRef.value.getBoundingClientRect()
      archParallaxProgress.value = Math.max(0, (viewH - rect.top) / (viewH + rect.height))
    }
  }, { passive: true })

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed')
        revealObserver.unobserve(e.target)
      }
    })
  }, { threshold: 0.04, rootMargin: '0px 0px -30px 0px' })

  setTimeout(() => {
    document.querySelectorAll('.dh-reveal').forEach(el => {
      revealObserver.observe(el)
    })
  }, 100)
})

onBeforeUnmount(() => {
  if (revealObserver) revealObserver.disconnect()
})

/* ── Code samples ── */
const codeSamples = {
  rest: `// Fetch all published posts
const res = await fetch('/api/posts?status=published')
const { data, meta } = await res.json()

// Create a new post
await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Hello World',
    status: 'draft',
    author: 'user_01'
  })
})`,
  graphql: `query GetPosts($status: String) {
  posts(where: { status: { equals: $status } }) {
    docs {
      id
      title
      author { name avatar { url } }
      publishedAt
      tags { name slug }
    }
    totalDocs
    hasNextPage
  }
}`,
  trpc: `// Instant in-repo type inference in Astro
const posts = await trpc.posts.find.query({
  where: { status: { equals: 'published' } },
  sort: '-publishedAt',
  limit: 10,
  populate: ['author', 'tags']
})

// Mutations are fully typed too
const post = await trpc.posts.create.mutate({
  data: {
    title: 'Hello World',
    status: 'draft',
  }
})`,
  websocket: `// Subscribe to real-time collection changes
const ws = new WebSocket('ws://localhost:4321/api/ws')

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'posts' }))
}

ws.onmessage = (event) => {
  const { type, doc } = JSON.parse(event.data)

  if (type === 'document.created') {
    console.log('New post:', doc.title)
    updateFeed(doc) // Update your UI reactively
  }
}`
}

const codeFiles = {
  rest: 'api-client.ts',
  graphql: 'queries.graphql',
  trpc: 'client.ts',
  websocket: 'realtime.ts',
}

const tabMeta = {
  rest:      { label: 'REST',      color: '#3b82f6', icon: '⬡' },
  graphql:   { label: 'GraphQL',   color: '#ec4899', icon: '◈' },
  trpc:      { label: 'tRPC',      color: '#8b5cf6', icon: '◉' },
  websocket: { label: 'WebSocket', color: '#10b981', icon: '◎' },
}

/* ── Bento features ── */
const bentoFeatures = [
  {
    id: 'schema',
    color: '#6366f1', glow: 'rgba(99,102,241,0.15)',
    size: 'large',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    label: 'SCHEMA FIRST',
    title: 'TypeScript-native schema definition',
    desc: 'Define collections, fields, and relations with full type inference. No magic strings, no surprises.',
    code: `{
  slug: 'posts',
  label: 'Posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'richtext' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
  ]
}`
  },
  {
    id: 'apis',
    color: '#ec4899', glow: 'rgba(236,72,153,0.15)',
    size: 'small',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    label: 'MULTI-PROTOCOL',
    title: '4 API protocols, one schema',
    desc: 'REST, GraphQL, tRPC & WebSocket — all auto-generated.',
    stat: '4',
    statLabel: 'APIs'
  },
  {
    id: 'db',
    color: '#14b8a6', glow: 'rgba(20,184,166,0.15)',
    size: 'small',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    label: 'DATABASES',
    title: 'SQLite, Postgres, MongoDB',
    desc: 'Unified schema across SQLite, Postgres & Mongo. Swap engines in config.',
    stat: '3',
    statLabel: 'DBs'
  },
  {
    id: 'admin',
    color: '#f59e0b', glow: 'rgba(245,158,11,0.15)',
    size: 'medium',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    label: 'ADMIN UI',
    title: 'Auto-generated dashboard',
    desc: 'A fully featured admin panel generated directly from your schema. No configuration needed.',
    pills: ['Live preview', 'Media library', 'Roles & perms', 'Audit log']
  },
  {
    id: 'fields',
    color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)',
    size: 'medium',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="9" y="3" width="6" height="12" rx="1"/><rect x="16" y="3" width="6" height="7" rx="1"/></svg>`,
    label: 'FIELDS',
    title: '25+ built-in field types',
    desc: 'Primitives, rich text, media, relationships, layout fields — every shape of content covered.',
    stat: '25+',
    statLabel: 'Field Types',
    tags: ['text', 'number', 'checkbox', 'date', 'email', 'password', 'textarea', 'select', 'radio', 'color', 'icon', 'richtext', 'json', 'code', 'upload', 'image', 'markdown', 'relationship', 'array', 'group', 'blocks', 'list', 'row', 'collapsible', 'tabs', 'button', 'action', 'secret']
  },
]

const highlightSnippet = (codeStr) => {
  if (!codeStr) return ''
  let code = codeStr
  code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  // Comments
  code = code.replace(/(\/\/.*)/g, '<span style="color: var(--sh-cmt); font-style: italic">$1</span>')
  // Strings
  code = code.replace(/('.*?')/g, '<span style="color: var(--sh-str)">$1</span>')
  // Keywords
  code = code.replace(/\b(const|await|new|if|query|return|defineCollection)\b/g, '<span style="color: var(--sh-kw)">$1</span>')
  // Functions
  code = code.replace(/\b(fetch|json|console|log|updateFeed|syncDocument|WebSocket|parse|mutate|list|create|text|richText|upload|relationship)\b/g, '<span style="color: var(--sh-fn)">$1</span>')
  // Variables/Globals
  code = code.replace(/\b(JSON|res|data|meta|ws|event|type|collection|doc|posts|trpc|post)\b/g, '<span style="color: var(--sh-var)">$1</span>')
  // Properties
  code = code.replace(/\b(method|headers|body|title|status|author|where|equals|sort|limit|populate|id|name|avatar|url|publishedAt|tags|slug|totalDocs|hasNextPage|fields|cover|required|allowedTypes|to|many)\b/g, '<span style="color: var(--sh-prop)">$1</span>')
  
  return code
}

const highlightedCode = computed(() => highlightSnippet(codeSamples[activeTab.value]))
</script>

<template>
  <div class="dh-root">

    <!-- ═══════════════ HERO ═══════════════ -->
    <section class="dh-hero">
      <!-- Background: subtle grid + dark radial -->
      <div class="hero-bg" aria-hidden="true">
        <div class="hero-grid"></div>
        <div class="hero-radial"></div>
      </div>

      <!-- Noise grain -->
      <div class="hero-grain" aria-hidden="true"></div>

      <div class="hero-split" :class="{ visible: mounted }">
        <!-- ── LEFT: Text column ── -->
        <div class="hero-left">
          <!-- Version badge -->
          <a href="/changelog" class="hero-badge">
            <span class="badge-pulse"></span>
            <span class="badge-text">{{ versionText }}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>

          <!-- Headline -->
          <h1 class="hero-h1">
            Blocks for humans.<br>
            Data for machines.<br>
            <span class="hero-h1-dim">APIs for everywhere.</span>
          </h1>

          <!-- <p class="hero-h1">
            The Astro-native headless CMS for modern web applications.
          </p> -->

          <p class="hero-sub">
            Stop writing boilerplate. Kyro turns your TypeScript schema into REST, GraphQL,
            tRPC &amp; WebSocket APIs — plus a full admin dashboard, automatically.
          </p>

          <!-- Quick CLI Snippet -->
          <div class="hero-cli-container">
            <button class="hero-cli-box" @click="copyCommand" aria-label="Copy CLI command">
              <span class="cli-prompt">~ $</span>
              <code class="cli-command">npm create kyro@latest</code>
              <span class="cli-copy-badge">
                <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="copied-check"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
              </span>
            </button>
          </div>

          <!-- CTAs -->
          <div class="hero-actions">
            <a href="/getting-started" class="btn-primary" id="hero-cta-primary">
              <span>Explore the platform</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a href="/architecture" class="btn-outline" id="hero-cta-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>How it works</span>
            </a>
          </div>
        </div>

        <!-- ── RIGHT: SVG Hub Visual ── -->
        <div class="hero-right" aria-hidden="true">
          <div class="hub-wrap">
            <svg class="hub-svg" viewBox="0 0 480 380" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <!-- Glow filter for hub -->
                <filter id="hub-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur"/>
                  <feFlood flood-color="var(--k-accent)" flood-opacity="0.2" result="color"/>
                  <feComposite in="color" in2="blur" operator="in" result="glow"/>
                  <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <!-- Glow for connection lines -->
                <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <!-- Path IDs for dot animation -->
                <path id="path-rest" d="M 240 150 C 240 100 320 80 380 60"/>
                <path id="path-graphql" d="M 180 190 C 140 190 100 160 80 130"/>
                <path id="path-trpc" d="M 300 190 C 340 190 400 160 420 130"/>
                <path id="path-ws" d="M 240 230 C 240 270 160 300 100 320"/>
              </defs>

              <!-- Background subtle glow behind hub -->
              <ellipse cx="240" cy="190" rx="100" ry="80" fill="var(--glow-base)" filter="url(#hub-glow)"/>

              <!-- Connection paths -->
              <!-- REST (top-right) -->
              <path d="M 240 150 C 240 100 320 80 380 60" fill="none" stroke="var(--border-2)" stroke-width="1.5" stroke-dasharray="6 4" filter="url(#line-glow)"/>
              <!-- GraphQL (left) -->
              <path d="M 180 190 C 140 190 100 160 80 130" fill="none" stroke="var(--border-2)" stroke-width="1.5" stroke-dasharray="6 4" filter="url(#line-glow)"/>
              <!-- tRPC (right) -->
              <path d="M 300 190 C 340 190 400 160 420 130" fill="none" stroke="var(--border-2)" stroke-width="1.5" stroke-dasharray="6 4" filter="url(#line-glow)"/>
              <!-- WebSocket (bottom-left) -->
              <path d="M 240 230 C 240 270 160 300 100 320" fill="none" stroke="var(--border-2)" stroke-width="1.5" stroke-dasharray="6 4" filter="url(#line-glow)"/>

              <!-- Animated flow dots -->
              <circle r="3.5" fill="var(--ink)" class="flow-dot">
                <animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#path-rest"/></animateMotion>
              </circle>
              <circle r="3.5" fill="var(--ink)" class="flow-dot">
                <animateMotion dur="2.8s" begin="0.7s" repeatCount="indefinite"><mpath href="#path-graphql"/></animateMotion>
              </circle>
              <circle r="3.5" fill="var(--ink)" class="flow-dot">
                <animateMotion dur="3s" begin="1.4s" repeatCount="indefinite"><mpath href="#path-trpc"/></animateMotion>
              </circle>
              <circle r="3.5" fill="var(--ink)" class="flow-dot">
                <animateMotion dur="2.6s" begin="2.1s" repeatCount="indefinite"><mpath href="#path-ws"/></animateMotion>
              </circle>

              <!-- Central Hub box -->
              <g class="hub-center" filter="url(#hub-glow)">
                <rect x="180" y="150" width="120" height="80" rx="14" fill="var(--bg-2)" stroke="var(--border-2)" stroke-width="1.5"/>
                <g transform="translate(224, 174)">
                  <!-- Real Kyro logo mark inside hub -->
                  <image href="/logo-white.svg" class="logo-dark" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>
                  <image href="/logo.svg" class="logo-light" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>
                </g>
                <!-- Hub label -->
                <text x="240" y="220" text-anchor="middle" fill="var(--ink-3)" font-size="9" font-family="'JetBrains Mono', monospace" letter-spacing="0.12em">KYRO ENGINE</text>
              </g>

              <!-- Endpoint: REST (top-right) -->
              <g class="endpoint-box">
                <rect x="340" y="38" width="84" height="30" rx="8" fill="var(--bg-1)" stroke="var(--border)" stroke-width="1"/>
                <text x="382" y="57" text-anchor="middle" fill="var(--ink-2)" font-size="11" font-family="'JetBrains Mono', monospace" font-weight="600">REST</text>
              </g>

              <!-- Endpoint: GraphQL (left) -->
              <g class="endpoint-box">
                <rect x="16" y="110" width="96" height="30" rx="8" fill="var(--bg-1)" stroke="var(--border)" stroke-width="1"/>
                <text x="64" y="129" text-anchor="middle" fill="var(--ink-2)" font-size="11" font-family="'JetBrains Mono', monospace" font-weight="600">GraphQL</text>
              </g>

              <!-- Endpoint: tRPC (right) -->
              <g class="endpoint-box">
                <rect x="374" y="110" width="80" height="30" rx="8" fill="var(--bg-1)" stroke="var(--border)" stroke-width="1"/>
                <text x="414" y="129" text-anchor="middle" fill="var(--ink-2)" font-size="11" font-family="'JetBrains Mono', monospace" font-weight="600">tRPC</text>
              </g>

              <!-- Endpoint: WebSocket (bottom-left) -->
              <g class="endpoint-box">
                <rect x="16" y="306" width="104" height="30" rx="8" fill="var(--bg-1)" stroke="var(--border)" stroke-width="1"/>
                <text x="68" y="325" text-anchor="middle" fill="var(--ink-2)" font-size="11" font-family="'JetBrains Mono', monospace" font-weight="600">WebSocket</text>
              </g>

              <!-- DB indicator bottom right -->
              <g class="endpoint-box">
                <rect x="330" y="290" width="134" height="64" rx="8" fill="var(--bg-1)" stroke="var(--border)" stroke-width="1"/>
                <text x="397" y="311" text-anchor="middle" fill="var(--ink-3)" font-size="9" font-family="'JetBrains Mono', monospace" letter-spacing="0.08em">DATABASE</text>
                <text x="397" y="330" text-anchor="middle" fill="var(--ink-2)" font-size="10" font-family="'JetBrains Mono', monospace">SQLite · Postgres</text>
                <text x="397" y="344" text-anchor="middle" fill="var(--ink-2)" font-size="10" font-family="'JetBrains Mono', monospace">MongoDB</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <!-- Parallax Image Section -->
      <div class="parallax-section dh-reveal" ref="parallaxRef">
        <div 
          class="parallax-heading"
          :style="{ opacity: Math.max(0, 1 - parallaxProgress * 2.5), transform: `translateY(${parallaxProgress * -30}px)` }"
        >
          <h2 class="parallax-h2">The <em>Astro-native</em> headless CMS for modern web applications.</h2>
        </div>
        <div class="parallax-stage">
          <div class="parallax-ambient-glow" aria-hidden="true"></div>
          <div 
            class="parallax-image-wrapper" 
            :style="{ transform: `translateY(${(parallaxProgress - 0.3) * -60}px) rotateX(${Math.max(0, 12 - parallaxProgress * 24)}deg) scale(${1.02 + Math.max(0, 0.03 - parallaxProgress * 0.06)})` }"
          >
            <div class="parallax-screen-bezel"></div>
            <img src="/assets/dashboard-light.png" alt="Kyro CMS Admin Dashboard Light" class="admin-parallax-img light-only" />
            <img src="/assets/dashboard-dark.png" alt="Kyro CMS Admin Dashboard Dark" class="admin-parallax-img dark-only" />
            <div class="parallax-shine" aria-hidden="true"></div>
          </div>
        </div>
      </div>

      <!-- Logo cloud at bottom of hero -->
      <div class="hero-marquee-band" :class="{ visible: mounted }">
        <p class="marquee-eyebrow">Built with tools you are already familiar with.</p>
        <LogoMarquee />
      </div>
    </section>

    <!-- ═══════════════ BENTO GRID ═══════════════ -->
    <section class="dh-bento-section dh-reveal">
      <div class="bento-header">
        <span class="sec-eyebrow">CAPABILITIES</span>
        <h2 class="sec-h2">Everything you need, nothing you don't</h2>
        <p class="sec-p">Production-ready out of the box. From local SQLite to global edge deployments.</p>
      </div>

      <div class="bento-grid">
        <!-- Large card: Schema -->
        <div class="bento-card bento-large" :style="{ '--card-color': bentoFeatures[0].color, '--card-glow': bentoFeatures[0].glow }">
          <div class="bento-card-inner">
            <div class="bento-card-header">
              <span class="bento-icon" v-html="bentoFeatures[0].icon"></span>
              <span class="bento-eyebrow">{{ bentoFeatures[0].label }}</span>
            </div>
            <h3 class="bento-title">{{ bentoFeatures[0].title }}</h3>
            <p class="bento-desc">{{ bentoFeatures[0].desc }}</p>
            <div class="bento-code-preview">
              <pre><code><span v-html="highlightSnippet(bentoFeatures[0].code)"></span></code></pre>
            </div>
          </div>
          <div class="bento-glow" aria-hidden="true"></div>
        </div>

        <!-- Small card: APIs -->
        <div class="bento-card bento-small" :style="{ '--card-color': bentoFeatures[1].color, '--card-glow': bentoFeatures[1].glow }">
          <div class="bento-card-inner">
            <div class="bento-card-header">
              <span class="bento-icon" v-html="bentoFeatures[1].icon"></span>
              <span class="bento-eyebrow">{{ bentoFeatures[1].label }}</span>
            </div>
            <h3 class="bento-title">{{ bentoFeatures[1].title }}</h3>
            <p class="bento-desc">{{ bentoFeatures[1].desc }}</p>
            <div class="bento-big-stat">
              <span class="big-num">4</span>
              <span class="big-label">APIs</span>
            </div>
          </div>
          <div class="bento-glow" aria-hidden="true"></div>
        </div>

        <!-- Small card: Databases -->
        <div class="bento-card bento-small" :style="{ '--card-color': bentoFeatures[2].color, '--card-glow': bentoFeatures[2].glow }">
          <div class="bento-card-inner">
            <div class="bento-card-header">
              <span class="bento-icon" v-html="bentoFeatures[2].icon"></span>
              <span class="bento-eyebrow">{{ bentoFeatures[2].label }}</span>
            </div>
            <h3 class="bento-title">{{ bentoFeatures[2].title }}</h3>
            <p class="bento-desc">{{ bentoFeatures[2].desc }}</p>
            <div class="bento-db-pills">
              <span class="db-pill">SQLite</span>
              <span class="db-pill">PostgreSQL</span>
              <span class="db-pill">MongoDB</span>
            </div>
          </div>
          <div class="bento-glow" aria-hidden="true"></div>
        </div>

        <!-- Medium card: Admin UI -->
        <div class="bento-card bento-medium" :style="{ '--card-color': bentoFeatures[3].color, '--card-glow': bentoFeatures[3].glow }">
          <div class="bento-card-inner">
            <div class="bento-card-header">
              <span class="bento-icon" v-html="bentoFeatures[3].icon"></span>
              <span class="bento-eyebrow">{{ bentoFeatures[3].label }}</span>
            </div>
            <h3 class="bento-title">{{ bentoFeatures[3].title }}</h3>
            <p class="bento-desc">{{ bentoFeatures[3].desc }}</p>
            <div class="bento-pills-row">
              <span v-for="pill in bentoFeatures[3].pills" :key="pill" class="feature-pill">{{ pill }}</span>
            </div>
          </div>
          <div class="bento-glow" aria-hidden="true"></div>
        </div>

        <!-- Medium card: Field types -->
        <div class="bento-card bento-xl" :style="{ '--card-color': bentoFeatures[4].color, '--card-glow': bentoFeatures[4].glow }">
          <div class="bento-card-inner">
            <div class="bento-card-header">
              <span class="bento-icon" v-html="bentoFeatures[4].icon"></span>
              <span class="bento-eyebrow">{{ bentoFeatures[4].label }}</span>
            </div>
            <h3 class="bento-title">{{ bentoFeatures[4].title }}</h3>
            <p class="bento-desc">{{ bentoFeatures[4].desc }}</p>
            <div class="bento-tags-cloud">
              <span v-for="tag in bentoFeatures[4].tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
          </div>
          <div class="bento-glow" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ CODE / APIs ═══════════════ -->
    <section class="dh-ide-section dh-reveal">
      <div class="ide-layout">
        <div class="ide-info">
          <span class="sec-eyebrow">MULTI-PROTOCOL APIs</span>
          <h2 class="sec-h2">One schema.<br>Four API protocols.</h2>
          <p class="sec-p">Define your collections once — Kyro generates REST, GraphQL, tRPC, and WebSocket APIs automatically. No extra config, no code generation step.</p>
          <ul class="ide-bullets">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Fully typed end-to-end with TypeScript
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Auto-generated OpenAPI &amp; GraphQL schemas
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Real-time subscriptions via WebSocket
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Works with any frontend or backend client
            </li>
          </ul>
          <a href="/reference/api-overview" class="ide-link">
            Explore API Reference
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>

        <div class="ide-window" :style="{ '--active-color': tabMeta[activeTab].color }">
          <!-- Tabs -->
          <div class="ide-tabs">
            <button
              v-for="(meta, key) in tabMeta"
              :key="key"
              class="ide-tab"
              :class="{ active: activeTab === key }"
              @click="activeTab = key"
            >
              <span class="ide-tab-dot"></span>
              {{ meta.label }}
            </button>
          </div>

          <!-- Chrome bar -->
          <div class="ide-chrome">
            <div class="ide-chrome-dots" aria-hidden="true">
              <span class="dot-r"></span>
              <span class="dot-y"></span>
              <span class="dot-g"></span>
            </div>
            <span class="ide-chrome-file">{{ codeFiles[activeTab] }}</span>
            <span class="ide-lang-badge">{{ tabMeta[activeTab].label }}</span>
          </div>

          <!-- Code body -->
          <div class="ide-code-body">
            <div class="ide-line-nums" aria-hidden="true">
              <template v-for="n in codeSamples[activeTab].split('\n').length" :key="n">
                <span>{{ n }}</span>
              </template>
            </div>
            <pre class="ide-pre"><code v-html="highlightedCode"></code></pre>
          </div>

          <!-- Status bar -->
          <div class="ide-statusbar">
            <span class="status-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Ready
            </span>
            <span class="status-item status-right">
              ● {{ tabMeta[activeTab].label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ ARCHITECTURE ═══════════════ -->
    <section class="dh-arch-section dh-reveal" ref="archParallaxRef">
      <!-- Parallax Background Image -->
      <div 
        class="arch-bg-parallax"
        :style="{ transform: `translateY(${(archParallaxProgress - 0.5) * -120}px) rotateX(${Math.max(0, 10 - archParallaxProgress * 20)}deg) scale(1.1)` }"
      >
        <img src="/assets/pagescreen-light.png" alt="" class="arch-bg-img light-only" />
        <img src="/assets/pagescreen-dark.png" alt="" class="arch-bg-img dark-only" />
        <div class="arch-bg-overlay"></div>
      </div>

      <div class="arch-header">
        <span class="sec-eyebrow">ARCHITECTURE</span>
        <h2 class="sec-h2">Built for Astro. Runs everywhere.</h2>
        <p class="sec-p">A layered architecture that cleanly separates your schema from the adapter, making database migrations painless.</p>
      </div>
      <div class="arch-content">
        <ArchitectureDiagram />
      </div>
    </section>
    <!-- ═══════════════ FINAL CTA ═══════════════ -->
    <section class="dh-cta dh-reveal">
      <div class="cta-grid" aria-hidden="true"></div>
      <div class="cta-content">
        <span class="sec-eyebrow">GET STARTED</span>
        <h2 class="cta-h2">Ready to build something great?</h2>
        <p class="cta-p">One command. Full-featured headless CMS with auto-generated admin, 4 API protocols, and multi-database support — no lock-in.</p>

        <div class="cta-terminal">
          <code>
            <span class="t-tilde">~</span>
            <span class="t-dollar">$</span>
            <span class="t-cmd">npm create kyro@latest</span>
          </code>
        </div>

        <div class="cta-btns">
          <a href="/getting-started" class="btn-primary btn-lg" id="cta-start-building">
            <span>Start Building</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a href="/guides/configuration" class="btn-outline">Read the Docs</a>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FOOTER ═══════════════ -->
    <footer class="dh-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-col">
            <a href="/" class="footer-logo" aria-label="Kyro CMS">
              <img src="/logo-white.svg" alt="Kyro CMS" class="footer-logo-icon logo-dark" />
              <img src="/logo.svg" alt="Kyro CMS" class="footer-logo-icon logo-light" />
              <span>Kyro CMS</span>
            </a>
            <p class="footer-tagline">The Astro-native headless CMS<br>for modern web applications.</p>
            <div class="footer-social">
              <a href="https://github.com/danielDozie/kyro-cms" target="_blank" rel="noopener" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>

          <div class="footer-links-grid">
            <div class="footer-col">
              <h4>Product</h4>
              <a href="/getting-started">Getting Started</a>
              <a href="/guides/configuration">Configuration</a>
              <a href="/reference/api-overview">API Reference</a>
              <a href="/changelog">Changelog</a>
            </div>
            <div class="footer-col">
              <h4>Guides</h4>
              <a href="/guides/field-types">Field Types</a>
              <a href="/guides/authentication">Authentication</a>
              <a href="/guides/blocks-builder">Blocks Builder</a>
              <a href="/guides/deployment">Deployment</a>
            </div>
            <div class="footer-col">
              <h4>Community</h4>
              <a href="https://github.com/danielDozie/kyro-cms" target="_blank" rel="noopener">GitHub</a>
              <a href="/roadmap">Roadmap</a>
              <a href="/changelog">Releases</a>
              <a href="/architecture">Architecture</a>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p>Copyright &copy; {{ new Date().getFullYear() }} Kyro CMS.</p>
        </div>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* ════════════════════════════════════════
   THEME LOGO TOGGLING
   ════════════════════════════════════════ */
:root:not(.dark) .logo-dark {
  display: none !important;
}

:root.dark .logo-light {
  display: none !important;
}

/* ════════════════════════════════════════
   VARIABLES & ROOT
   ════════════════════════════════════════ */
.dh-root {
  --bg:          #0c0d10;
  --bg-1:        #101114;
  --bg-2:        #16181e;
  --bg-3:        #1e2028;
  --ink:         #f2f2f2;
  --ink-2:       rgba(255,255,255,0.5);
  --ink-3:       rgba(255,255,255,0.28);
  --border:      rgba(255,255,255,0.07);
  --border-2:    rgba(255,255,255,0.14);
  --glass:       rgba(12,13,16,0.82);
  --radius:      16px;
  --radius-sm:   10px;
  --radius-xs:   7px;
  --font:        'Inter', system-ui, sans-serif;
  --mono:        'JetBrains Mono', 'Fira Code', monospace;
  --ease:        cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  font-family: var(--font);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  width: 100%;
  overflow-x: hidden;
  --shadow: rgba(0,0,0,0.5);
  --grid-line: rgba(255,255,255,0.035);
  --glow-base: rgba(255,255,255,0.04);
  
  --sh-kw: #c678dd;
  --sh-fn: #61afef;
  --sh-var: #e5c07b;
  --sh-str: #98c379;
  --sh-prop: #d19a66;
  --sh-cmt: #5c6370;
}

:root:not(.dark) .dh-root {
  --bg:          #f8f8f9;
  --bg-1:        #ffffff;
  --bg-2:        #f3f3f5;
  --bg-3:        #ebebed;
  --ink:         #0e0f12;
  --ink-2:       rgba(0,0,0,0.55);
  --ink-3:       rgba(0,0,0,0.32);
  --border:      rgba(0,0,0,0.07);
  --border-2:    rgba(0,0,0,0.15);
  --glass:       rgba(248,248,249,0.90);
  --shadow:      rgba(0,0,0,0.08);
  --grid-line:   rgba(0,0,0,0.04);
  --glow-base:   rgba(0,0,0,0.025);

  --sh-kw: #a626a4;
  --sh-fn: #4078f2;
  --sh-var: #986801;
  --sh-str: #50a14f;
  --sh-prop: #b75c00;
  --sh-cmt: #a0a1a7;
}

/* ════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════ */
.dh-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  border-bottom: 1px solid var(--border);
  background: var(--glass);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  transition: border-color 0.3s, background 0.3s;
}

.dh-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-logo {
  display: flex; align-items: center; gap: 9px;
  text-decoration: none;
  color: var(--ink);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.nav-logo-icon { width: 22px; height: 22px; }
.nav-logo-cms { color: rgba(255,255,255,0.4); font-weight: 500; }

.nav-links {
  display: flex; align-items: center; gap: 4px;
  margin-left: 12px;
}

.nav-link {
  padding: 6px 12px;
  font-size: 0.86rem;
  font-weight: 450;
  color: var(--ink-2);
  text-decoration: none;
  border-radius: var(--radius-xs);
  transition: color 0.15s, background 0.15s;
}
.nav-link:hover { color: var(--ink); background: var(--bg-2); }

.nav-actions {
  display: flex; align-items: center; gap: 10px;
  margin-left: auto;
}

.nav-gh {
  display: flex; align-items: center;
  padding: 6px;
  color: var(--ink-3);
  text-decoration: none;
  border-radius: var(--radius-xs);
  transition: color 0.15s;
}
.nav-gh:hover { color: var(--ink); }

.nav-cta {
  display: inline-flex; align-items: center;
  padding: 7px 16px;
  font-size: 0.83rem; font-weight: 700;
  color: #ffffff;
  background: var(--k-accent);
  border-radius: var(--radius-xs);
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s var(--ease);
}
.nav-cta:hover { opacity: 0.88; transform: translateY(-1px); }

/* ════════════════════════════════════════
   HERO
   ════════════════════════════════════════ */
.dh-hero {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 90px 0 0;
  overflow: hidden;
}

/* Background */
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,0,0,0.6) 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,0,0,0.6) 0%, transparent 80%);
}

.hero-radial {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 30%, var(--glow-base) 0%, transparent 70%);
}

.hero-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
}

/* Split grid hero layout */
.hero-split {
  position: relative;
  z-index: 2;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  min-height: calc(100dvh - 90px - 200px);
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.8s var(--ease), transform 0.8s var(--ease);
}
.hero-split.visible { opacity: 1; transform: translateY(0); }

/* Left column */
.hero-left {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Version badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 8px;
  border: 1px solid var(--border-2);
  background: rgba(255,255,255,0.02);
  border-radius: 99px;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ink-2);
  backdrop-filter: blur(8px);
  width: fit-content;
  transition: border-color 0.2s, color 0.2s;
}
.hero-badge:hover { border-color: var(--ink-3); color: var(--ink); }

.badge-pulse {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ink-3);
  box-shadow: 0 0 0 0 rgba(255,255,255,0.15);
  animation: pulse-ring 2s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
  50% { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
}

/* Headline */
.hero-h1 {
  font-size: clamp(2.4rem, 4.5vw, 3.8rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--ink);
  margin: 0;
}
.hero-h1-dim { color: var(--ink-3); }

.hero-sub {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ink-2);
  max-width: 480px;
  margin: 0;
}

/* Hero CTAs */
.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--bg);
  background: var(--ink);
  border-radius: var(--radius-xs);
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s var(--ease);
  letter-spacing: -0.01em;
}
.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
.btn-primary.btn-lg { padding: 14px 28px; font-size: 0.95rem; }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid var(--border-2);
  border-radius: var(--radius-xs);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, transform 0.2s var(--ease);
  backdrop-filter: blur(8px);
}
.btn-outline:hover {
  border-color: var(--ink-3);
  color: var(--ink);
  transform: translateY(-2px);
}

/* Quick CLI Snippet Box */
.hero-cli-container {
  display: flex;
  margin-top: 4px;
}

.hero-cli-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--surface-1, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-xs, 8px);
  font-family: var(--font-mono, monospace);
  font-size: 0.84rem;
  color: var(--ink-1, #e0e0e0);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s;
  user-select: none;
  backdrop-filter: blur(8px);
}

.hero-cli-box:hover {
  background: var(--surface-2, rgba(255, 255, 255, 0.08));
  border-color: var(--accent, #6366f1);
  transform: translateY(-1px);
}

.cli-prompt {
  color: var(--accent, #818cf8);
  font-weight: 700;
}

.cli-command {
  font-family: inherit;
  color: inherit;
  background: transparent;
  padding: 0;
}

.cli-copy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-2, #a1a1aa);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  transition: color 0.2s, background-color 0.2s;
}

.hero-cli-box:hover .cli-copy-badge {
  color: var(--ink-1, #ffffff);
  background: rgba(255, 255, 255, 0.12);
}

.copied-check {
  color: #10b981;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--ink-2);
  text-decoration: none;
  transition: color 0.15s;
}
.btn-ghost:hover { color: var(--ink); }

/* Stats bar */
.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-num {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.stat-sep {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
}

/* Right column: Hub SVG */
.hero-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hub-wrap {
  width: 100%;
  max-width: 500px;
  animation: hub-float 7s ease-in-out infinite;
}

@keyframes hub-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

.hub-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.flow-dot {
  filter: drop-shadow(0 0 5px rgba(255,255,255,0.6));
}

.hub-center { cursor: default; }
.endpoint-box { cursor: default; }

/* Logo cloud at hero bottom */
.hero-marquee-band {
  position: relative;
  z-index: 2;
  margin-top: auto;
  padding-top: 48px;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.8s 0.4s var(--ease), transform 0.8s 0.4s var(--ease);
}
.hero-marquee-band.visible { opacity: 1; transform: translateY(0); }

.marquee-eyebrow {
  text-align: center;
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  text-transform: uppercase;
  margin-bottom: 20px;
}

/* ════════════════════════════════════════
   REVEAL ANIMATION
   ════════════════════════════════════════ */
.dh-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.8s var(--ease), transform 0.8s var(--ease);
}
.dh-reveal.revealed { opacity: 1; transform: none; }

/* ════════════════════════════════════════
   SHARED SECTION TEXT
   ════════════════════════════════════════ */
.sec-eyebrow {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--ink-3);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.sec-h2 {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.15;
  color: var(--ink);
  margin: 0 0 16px;
}

.sec-p {
  font-size: 0.97rem;
  line-height: 1.7;
  color: var(--ink-2);
  max-width: 560px;
  margin: 0 auto;
}

/* ════════════════════════════════════════
   BENTO GRID
   ════════════════════════════════════════ */
.dh-bento-section {
  max-width: 1280px;
  margin: 0 auto;
  padding: 6rem 48px;
}

.bento-header {
  text-align: center;
  margin-bottom: 48px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
}

/* Card base */
.bento-card {
  position: relative;
  background: var(--bg-2);
  border: none;
  border-radius: var(--radius);
  overflow: hidden;
  transition: transform 0.3s var(--ease), box-shadow 0.3s;
  cursor: default;
}

.bento-card:hover {
  transform: translateY(-3px);
}

/* Glow overlay */
.bento-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% 0%, var(--card-glow, var(--k-accent-glow)) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.bento-card:hover .bento-glow { opacity: 1; }

.bento-large { grid-column: span 2; grid-row: span 2; }
.bento-small { grid-column: span 1; }
.bento-medium { grid-column: span 2; }
.bento-xl { grid-column: span 4; }

.bento-card-inner {
  position: relative;
  z-index: 1;
  padding: 28px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bento-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.bento-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border: 1px solid var(--bg-2);
  border-radius: 9px;
  background: var(--bg-1);
  color: var(--ink-2);
  flex-shrink: 0;
}

.bento-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.bento-title {
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.3;
  margin: 0;
}

.bento-desc {
  font-size: 0.845rem;
  line-height: 1.65;
  color: var(--ink-2);
  margin: 0;
}

/* Code preview */
.bento-code-preview {
  margin-top: auto;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  overflow: hidden;
  flex: 1;
}

.bento-code-preview pre {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.65;
  color: rgba(255,255,255,0.55);
  white-space: pre;
  overflow: hidden;
}

/* Big stat */
.bento-big-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
}
.big-num {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  color: rgba(255,255,255,0.12);
  line-height: 1;
}
.big-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

/* DB pills */
.bento-db-pills {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.db-pill {
  display: inline-block;
  padding: 4px 10px;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 6px;
  width: fit-content;
}

/* Feature pills */
.bento-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.feature-pill {
  padding: 4px 10px;
  font-size: 0.74rem;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 6px;
}

/* Tag cloud */
.bento-tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: auto;
  max-height: 100px;
  overflow: hidden;
}

.tag-chip {
  padding: 3px 8px;
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 5px;
}

/* ════════════════════════════════════════
   IDE / API SECTION
   ════════════════════════════════════════ */
.dh-ide-section {
  background: var(--bg-1);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 6rem 48px;
}

.ide-layout {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 64px;
  align-items: center;
}

.ide-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ide-bullets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ide-bullets li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: var(--ink-2);
}

.ide-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-2);
  text-decoration: none;
  border-bottom: 1px solid var(--border-2);
  padding-bottom: 2px;
  width: fit-content;
  transition: color 0.15s, border-color 0.15s;
}
.ide-link:hover { color: var(--ink); border-color: var(--ink-3); }

/* IDE window */
.ide-window {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-1);
  box-shadow: 0 0 0 1px var(--shadow), 0 32px 80px -16px var(--shadow);
}

.ide-tabs {
  display: flex;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  padding: 0 8px;
  gap: 2px;
  overflow-x: auto;
}

.ide-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink-3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.ide-tab:hover { color: var(--ink-2); }
.ide-tab.active {
  color: var(--ink);
  border-bottom-color: var(--active-color, var(--ink-3));
}

.ide-tab-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ink-3);
  transition: background 0.15s;
}
.ide-tab.active .ide-tab-dot { background: var(--active-color, var(--ink)); }

.ide-chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}

.ide-chrome-dots {
  display: flex;
  gap: 5px;
}
.dot-r, .dot-y, .dot-g {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--border-2);
}

.ide-chrome-file {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink-3);
  flex: 1;
  text-align: center;
}

.ide-lang-badge {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.05em;
}

.ide-code-body {
  display: flex;
  padding: 16px 0;
  min-height: 220px;
  background: var(--bg-1);
}

.ide-line-nums {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  border-right: 1px solid var(--border);
  min-width: 38px;
  text-align: right;
}
.ide-line-nums span {
  font-family: var(--mono);
  font-size: 0.72rem;
  line-height: 1.65;
  color: var(--ink-3);
}

.ide-pre {
  margin: 0;
  padding: 0 20px;
  font-family: var(--mono);
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--ink);
  white-space: pre;
  overflow-x: auto;
  flex: 1;
}

.ide-statusbar {
  display: flex;
  align-items: center;
  padding: 4px 14px;
  background: var(--bg-2);
  border-top: 1px solid var(--border);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  color: var(--ink-3);
  font-family: var(--mono);
}

.status-right {
  margin-left: auto;
  color: var(--ink-3);
}

/* ════════════════════════════════════════
   ARCHITECTURE SECTION
   ════════════════════════════════════════ */
.dh-arch-section {
  max-width: 1280px;
  margin: 0 auto;
  padding: 6rem 48px;
  position: relative;
}

/* Background Parallax Image */
.arch-bg-parallax {
  position: absolute;
  top: 10%;
  left: 5%;
  right: 5%;
  bottom: 0;
  z-index: 0;
  opacity: 0.3; /* Transparent effect */
  pointer-events: none;
  transform-origin: top center;
  perspective: 1400px;
  /* Fade out edges so it blends nicely into the background */
  mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, transparent 90%);
}

.dark .arch-bg-parallax {
  opacity: 0.4;
}

.arch-bg-img {
  width: 100%;
  height: auto;
  border-radius: 16px;
  display: block;
}

.arch-header {
  text-align: center;
  margin-bottom: 48px;
  position: relative;
  z-index: 2;
}

.arch-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

/* ════════════════════════════════════════
   FINAL CTA
   ════════════════════════════════════════ */
.dh-cta {
  position: relative;
  border-top: 1px solid var(--border);
  overflow: hidden;
  padding: 7rem 48px;
  text-align: center;
}

.cta-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.8) 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.8) 0%, transparent 70%);
}

.cta-content {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cta-h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0;
}

.cta-p {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ink-2);
  max-width: 520px;
  margin: 0;
}

.cta-terminal {
  display: flex;
  justify-content: center;
}
.cta-terminal code {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-2);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  user-select: all;
}
.t-tilde { color: var(--ink-3); }
.t-dollar { color: var(--ink-3); }
.t-cmd { color: var(--ink); }

.cta-btns {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════ */
.dh-footer {
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 4rem 48px 2rem;
}

.footer-top {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 64px;
  padding-bottom: 3rem;
  border-bottom: 1px solid var(--border);
}

.footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--ink);
  font-weight: 700;
  font-size: 0.95rem;
}
.footer-logo-icon { width: 20px; height: 20px; }

.footer-tagline {
  font-size: 0.83rem;
  line-height: 1.65;
  color: var(--ink-3);
  margin: 0;
}

.footer-social {
  display: flex;
  gap: 8px;
}
.footer-social a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--ink-3);
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.footer-social a:hover {
  color: var(--ink);
  border-color: var(--border-2);
  background: rgba(255,255,255,0.07);
}

.footer-links-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col h4 {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 6px;
}

.footer-col a {
  font-size: 0.84rem;
  color: var(--ink-3);
  text-decoration: none;
  transition: color 0.15s;
  width: fit-content;
}
.footer-col a:hover { color: var(--ink); }

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2rem;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-bottom p {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 0;
}
.footer-bottom-links {
  display: flex;
  gap: 20px;
}
.footer-bottom-links a {
  font-size: 0.78rem;
  color: var(--ink-3);
  text-decoration: none;
  transition: color 0.15s;
}
.footer-bottom-links a:hover { color: var(--ink); }

/* ════════════════════════════════════════
   RESPONSIVE
   ════════════════════════════════════════ */
@media (max-width: 1024px) {
  .hero-split { grid-template-columns: 1fr; padding: 0 32px; }
  .hero-right { display: none; }
  .dh-bento-section { padding: 4rem 32px; }
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .bento-large { grid-column: span 2; }
  .bento-medium { grid-column: span 2; }
  .bento-xl { grid-column: span 2; }
  .ide-layout { grid-template-columns: 1fr; padding: 4rem 32px; gap: 40px; }
  .dh-ide-section { padding: 4rem 0; }
  .dh-arch-section { padding: 4rem 32px; }
  .dh-cta { padding: 5rem 32px; }
  .footer-top { grid-template-columns: 1fr; gap: 32px; }
  .footer-inner { padding: 3rem 32px 2rem; }
}

@media (max-width: 640px) {
  .dh-nav-inner { padding: 0 20px; gap: 16px; }
  .nav-links { display: none; }
  .hero-split { padding: 0 20px; gap: 32px; }
  .hero-h1 { font-size: 2rem; }
  .hero-stats { gap: 16px; flex-wrap: wrap; }
  .bento-grid { grid-template-columns: 1fr; }
  .bento-large, .bento-medium, .bento-xl { grid-column: span 1; }
  .bento-small { grid-column: span 1; }
  .dh-bento-section { padding: 3rem 20px; }
  .dh-ide-section { padding: 3rem 0; }
  .ide-layout { padding: 3rem 20px; }
  .dh-cta { padding: 4rem 20px; }
  .footer-links-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .footer-inner { padding: 2.5rem 20px 1.5rem; }
}

/* ════════════════════════════════════════
   REDUCED MOTION
   ════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .hub-wrap { animation: none; }
  .badge-pulse { animation: none; }
  .flow-dot { display: none; }
  .hero-split, .hero-marquee-band, .dh-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }




}

/* ════════════════════════════════════════
   LIGHT MODE — Monochrome (mirrors dark mode)
   ════════════════════════════════════════ */

/* 2. Navbar */
:root:not(.dark) .dh-nav {
  border-bottom-color: rgba(0, 0, 0, 0.07);
}

/* 3. Hero background */
:root:not(.dark) .hero-grid {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
}

:root:not(.dark) .hero-radial {
  background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(0, 0, 0, 0.04) 0%, transparent 70%);
}

:root:not(.dark) .hero-grain {
  opacity: 0;
}

/* 4. Hero badge */
:root:not(.dark) .hero-badge {
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.45);
}
:root:not(.dark) .hero-badge:hover {
  border-color: rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.7);
}

:root:not(.dark) .badge-pulse {
  background: rgba(0, 0, 0, 0.4);
  animation: pulse-ring-light 2s ease-in-out infinite;
}
@keyframes pulse-ring-light {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); }
  50%       { box-shadow: 0 0 0 5px rgba(0, 0, 0, 0); }
}

/* 5. Headline dim word */
:root:not(.dark) .hero-h1-dim {
  color: rgba(14, 15, 18, 0.28);
}

/* 6. CTA buttons */
:root:not(.dark) .btn-primary {
  background: #0e0f12;
  color: #f2f2f2;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
:root:not(.dark) .btn-primary:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

:root:not(.dark) .btn-outline {
  border-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.55);
}
:root:not(.dark) .btn-outline:hover {
  border-color: rgba(0, 0, 0, 0.25);
  color: rgba(0, 0, 0, 0.85);
}

/* Light mode CLI Box */
:root:not(.dark) .hero-cli-box {
  background: #f8fafc;
  border-color: rgba(0, 0, 0, 0.12);
  color: #0f172a;
}

:root:not(.dark) .hero-cli-box:hover {
  background: #f1f5f9;
  border-color: #6366f1;
}

:root:not(.dark) .cli-prompt {
  color: #4f46e5;
}

:root:not(.dark) .cli-copy-badge {
  color: #64748b;
  background: rgba(0, 0, 0, 0.06);
}

:root:not(.dark) .hero-cli-box:hover .cli-copy-badge {
  color: #0f172a;
  background: rgba(0, 0, 0, 0.1);
}

/* 7. Stats bar separator */
:root:not(.dark) .stat-sep {
  background: rgba(0, 0, 0, 0.1);
}

/* 8. Nav CTA */
:root:not(.dark) .nav-cta {
  background: #0e0f12;
  color: #f2f2f2;
}

/* 9. SVG Hub visual */
:root:not(.dark) .hub-svg path[stroke="rgba(255,255,255,0.15)"],
:root:not(.dark) .hub-svg path[d] {
  stroke: rgba(0, 0, 0, 0.14);
}

:root:not(.dark) .hub-center rect {
  fill: #e4e4e8;
  stroke: rgba(0, 0, 0, 0.12);
}

:root:not(.dark) .endpoint-box rect {
  fill: #e8e8ec;
  stroke: rgba(0, 0, 0, 0.1);
}

:root:not(.dark) .endpoint-box text,
:root:not(.dark) .hub-center text {
  fill: rgba(0, 0, 0, 0.5);
}

:root:not(.dark) .flow-dot {
  fill: rgba(0, 0, 0, 0.4);
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
}

:root:not(.dark) .hub-svg defs path { stroke: rgba(0, 0, 0, 0.14); }

/* 10. Marquee eyebrow */
:root:not(.dark) .marquee-eyebrow {
  color: rgba(0, 0, 0, 0.3);
}

/* 11. Bento section */
:root:not(.dark) .big-num {
  color: rgba(0, 0, 0, 0.1);
}

:root:not(.dark) .bento-code-preview pre {
  color: rgba(0, 0, 0, 0.45);
}

:root:not(.dark) .db-pill,
:root:not(.dark) .feature-pill,
:root:not(.dark) .tag-chip {
  color: rgba(0, 0, 0, 0.38);
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.07);
}

/* 12. IDE section */
:root:not(.dark) .dh-ide-section {
  background: #f3f3f5;
  border-top-color: rgba(0, 0, 0, 0.07);
  border-bottom-color: rgba(0, 0, 0, 0.07);
}

:root:not(.dark) .ide-bullets li svg {
  stroke: rgba(0, 0, 0, 0.35);
}

:root:not(.dark) .ide-link {
  color: rgba(0, 0, 0, 0.45);
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
:root:not(.dark) .ide-link:hover {
  color: rgba(0, 0, 0, 0.8);
  border-bottom-color: rgba(0, 0, 0, 0.25);
}

:root:not(.dark) .ide-window {
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 24px 64px -16px rgba(0, 0, 0, 0.12);
}

:root:not(.dark) .ide-tabs {
  background: rgba(0, 0, 0, 0.04);
  border-bottom-color: rgba(0, 0, 0, 0.07);
}

:root:not(.dark) .ide-chrome {
  background: #e8e8ec;
  border-bottom-color: rgba(0, 0, 0, 0.07);
}
:root:not(.dark) .ide-chrome-file { color: rgba(0, 0, 0, 0.3); }
:root:not(.dark) .ide-lang-badge  { color: rgba(0, 0, 0, 0.3); }

:root:not(.dark) .dot-r,
:root:not(.dark) .dot-y,
:root:not(.dark) .dot-g {
  background: rgba(0, 0, 0, 0.15);
}

:root:not(.dark) .ide-code-body { background: #f0f0f3; }
:root:not(.dark) .ide-line-nums { border-right-color: rgba(0, 0, 0, 0.07); }
:root:not(.dark) .ide-line-nums span { color: rgba(0, 0, 0, 0.18); }
:root:not(.dark) .ide-pre { color: rgba(0, 0, 0, 0.55); }

:root:not(.dark) .ide-statusbar {
  background: #e8e8ec;
  border-top-color: rgba(0, 0, 0, 0.07);
}
:root:not(.dark) .status-item { color: rgba(0, 0, 0, 0.3); }
:root:not(.dark) .status-right { color: rgba(0, 0, 0, 0.38); }

/* 14. Final CTA */
:root:not(.dark) .dh-cta {
  border-top-color: rgba(0, 0, 0, 0.07);
}

:root:not(.dark) .cta-grid {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
}

:root:not(.dark) .cta-terminal code {
  color: rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}
:root:not(.dark) .t-tilde { color: rgba(0, 0, 0, 0.2); }
:root:not(.dark) .t-dollar { color: rgba(0, 0, 0, 0.28); }
:root:not(.dark) .t-cmd    { color: rgba(0, 0, 0, 0.55); }

/* 15. Footer */
:root:not(.dark) .dh-footer {
  background: #f0f0f3;
  border-top-color: rgba(0, 0, 0, 0.07);
}

:root:not(.dark) .footer-bottom {
  border-top-color: rgba(0, 0, 0, 0.07);
}
:root:not(.dark) .footer-bottom p,
:root:not(.dark) .footer-bottom-links a {
  color: rgba(0, 0, 0, 0.35);
}
:root:not(.dark) .footer-bottom-links a:hover { color: rgba(0, 0, 0, 0.65); }

:root:not(.dark) .footer-col h4,
:root:not(.dark) .footer-col a,
:root:not(.dark) .footer-tagline {
  color: rgba(0, 0, 0, 0.38);
}
:root:not(.dark) .footer-col a:hover { color: rgba(0, 0, 0, 0.72); }

:root:not(.dark) .footer-social a {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.38);
}
:root:not(.dark) .footer-social a:hover {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.15);
  color: rgba(0, 0, 0, 0.7);
}

:root:not(.dark) .footer-top {
  border-bottom-color: rgba(0, 0, 0, 0.07);
}

/* ═══════════════ PARALLAX SECTION ═══════════════ */
.parallax-section {
  width: 100%;
  max-width: 1140px;
  margin: 4rem auto 6rem auto;
  padding: 0 1.5rem;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.parallax-heading {
  text-align: center;
  margin-bottom: 2.5rem;
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.parallax-h2 {
  font-size: clamp(1.68rem, 4.2vw, 2.52rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.03em;
  color: var(--k-text-1);
  max-width: 680px;
  margin: 0 auto;
}

.parallax-h2 em {
  font-style: normal;
  color: var(--k-text-2);
}

.parallax-stage {
  position: relative;
  perspective: 1400px;
  width: 100%;
}

.parallax-ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80%;
  height: 60%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%);
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

.dark .parallax-ambient-glow {
  background: radial-gradient(ellipse at center, rgba(130,140,248,0.06) 0%, rgba(168,85,247,0.03) 40%, transparent 70%);
}

.parallax-image-wrapper {
  position: relative;
  transform-origin: top center;
  border-radius: 14px;
  border: 1px solid var(--k-border-hover);
  box-shadow:
    0 2px 8px -2px rgba(0, 0, 0, 0.04),
    0 12px 30px -10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: var(--k-bg-elv);
  z-index: 2;
}

.dark .parallax-image-wrapper {
  box-shadow:
    0 2px 8px -2px rgba(0, 0, 0, 0.15),
    0 12px 30px -10px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

.parallax-screen-bezel {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--k-border-hover);
  z-index: 3;
  border-radius: 14px 14px 0 0;
}

.admin-parallax-img {
  width: 100%;
  height: auto;
  display: block;
  position: relative;
  z-index: 1;
}

.parallax-shine {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.06) 0%,
    transparent 40%,
    transparent 60%,
    rgba(255,255,255,0.02) 100%
  );
  pointer-events: none;
  z-index: 4;
}

.dark .light-only { display: none !important; }
:root:not(.dark) .dark-only { display: none !important; }

@media (max-width: 768px) {
  .parallax-section {
    margin: 2rem auto 3rem auto;
  }
  .parallax-stage {
    perspective: none;
  }
  .parallax-image-wrapper {
    transform: none !important;
  }
  .parallax-h2 {
    font-size: 1.4rem;
  }
}
</style>
