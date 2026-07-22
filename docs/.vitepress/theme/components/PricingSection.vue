<script setup>
const plans = [
  {
    name: 'Free',
    tagline: 'Open source',
    price: '$0',
    period: 'forever',
    badge: null,
    featured: true,
    cta: 'Get Started',
    ctaLink: '/getting-started',
    features: [
      'All field types & blocks',
      'REST, GraphQL, tRPC & WebSocket APIs',
      'Auto-generated admin dashboard',
      'PostgreSQL, MongoDB & SQLite',
      'Authentication & access control',
      'Drafts, versions & autosave',
      'Multi-tenant support',
      'MIT licensed',
    ],
  },
  {
    name: 'Pro',
    tagline: 'Managed hosting',
    price: 'Coming',
    period: '',
    badge: null,
    featured: false,
    cta: 'Join Waitlist',
    ctaLink: '#',
    features: [
      'Everything in Free',
      'One-click deploy to global edge',
      'Automatic database migrations',
      'Built-in CDN & image optimization',
      'Team collaboration & roles',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Custom solutions',
    price: 'Custom',
    period: '',
    badge: null,
    featured: false,
    cta: 'Contact Us',
    ctaLink: '#',
    features: [
      'Everything in Pro',
      'Custom integrations & plugins',
      'Dedicated support engineer',
      'SLA & uptime guarantees',
      'On-premise deployment',
      'Training & onboarding',
    ],
  },
]
</script>

<template>
  <section class="pr-section">
    <div class="pr-inner">
      <span class="pr-label">PRICING</span>
      <h2 class="pr-title">Start free. Scale when ready.</h2>
      <p class="pr-desc">Kyro is open source and free forever. No hidden fees, no vendor lock-in.</p>

      <div class="pr-grid">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="pr-card"
          :class="{ featured: plan.featured }"
        >
          <div class="pr-card-header">
            <div class="pr-card-top">
              <h3 class="pr-card-name">{{ plan.name }}</h3>
              <span v-if="plan.badge" class="pr-card-badge">{{ plan.badge }}</span>
            </div>
            <p class="pr-card-tagline">{{ plan.tagline }}</p>
            <div class="pr-card-price">
              <span class="pr-price-amount">{{ plan.price }}</span>
              <span v-if="plan.period" class="pr-price-period">{{ plan.period }}</span>
            </div>
          </div>

          <ul class="pr-card-features">
            <li v-for="f in plan.features" :key="f">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ f }}</span>
            </li>
          </ul>

          <a :href="plan.ctaLink" class="pr-card-cta" :class="{ 'cta-primary': plan.featured }">
            {{ plan.cta }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pr-section {
  padding: 100px 24px;
}

.pr-inner {
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.pr-label {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--k-accent, #6366f1);
  margin-bottom: 14px;
}

.pr-title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--k-text-1, #ededed);
  margin: 0 0 14px;
  line-height: 1.15;
}

.pr-desc {
  font-size: 1rem;
  color: var(--k-text-2, #a1a1a1);
  max-width: 480px;
  margin: 0 auto 48px;
  line-height: 1.7;
}

.pr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}

.pr-card {
  padding: 32px 28px;
  border-radius: 16px;
  border: 1px solid var(--k-border, rgba(255,255,255,0.08));
  background: var(--k-bg-root, #000);
  text-align: left;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}

.pr-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4);
}

.pr-card.featured {
  border-color: rgba(99, 102, 241, 0.4);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, var(--k-bg-root, #000) 40%);
  box-shadow: 0 0 40px -10px rgba(99, 102, 241, 0.15);
}

.pr-card.featured:hover {
  box-shadow: 0 0 60px -10px rgba(99, 102, 241, 0.25),
              0 20px 40px -15px rgba(0, 0, 0, 0.4);
}

.pr-card-header {
  margin-bottom: 24px;
}

.pr-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.pr-card-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--k-text-1, #ededed);
  margin: 0;
  letter-spacing: -0.02em;
}

.pr-card-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--k-accent, #6366f1);
  color: #fff;
}

.pr-card-tagline {
  font-size: 0.82rem;
  color: var(--k-text-3, #666666);
  margin: 0 0 16px;
}

.pr-card-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.pr-price-amount {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--k-text-1, #ededed);
}

.pr-price-period {
  font-size: 0.82rem;
  color: var(--k-text-3, #666666);
}

.pr-card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pr-card-features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--k-text-2, #a1a1a1);
  line-height: 1.5;
}

.pr-card-features li svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #10b981;
}

.pr-card-cta {
  display: block;
  width: 100%;
  padding: 12px 20px;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  border-radius: 10px;
  border: 1px solid var(--k-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--k-text-2, #a1a1a1);
  transition: all 0.2s ease;
}

.pr-card-cta:hover {
  border-color: var(--k-border-hover, rgba(255,255,255,0.16));
  color: var(--k-text-1, #ededed);
}

.pr-card-cta.cta-primary {
  background: var(--k-accent, #6366f1);
  border-color: var(--k-accent, #6366f1);
  color: #fff;
}

.pr-card-cta.cta-primary:hover {
  background: var(--k-accent-dim, #4f46e5);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .pr-section { padding: 70px 20px; }
  .pr-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
}
</style>
