<template>
  <div v-if="isVisible" ref="banner" class="announcement-banner">
    <div class="banner-content">
      <p>
        <strong>Notice:</strong> Kyro CMS is currently in active development. It has not reached a stable v1.0 release and is not yet fully ready for production use.
      </p>
      <a href="/development-status" class="learn-more-link">Learn more &rarr;</a>
    </div>
    <button class="close-button" @click="dismissBanner" aria-label="Close banner">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const banner = ref(null)
const isVisible = ref(true)
let observer = null

const updateHeight = () => {
  if (banner.value && isVisible.value) {
    document.documentElement.style.setProperty('--vp-layout-top-height', `${banner.value.offsetHeight}px`)
  } else {
    document.documentElement.style.removeProperty('--vp-layout-top-height')
  }
}

const dismissBanner = () => {
  isVisible.value = false
  if (typeof window !== 'undefined') {
    localStorage.setItem('kyro_docs_banner_dismissed', 'true')
    updateHeight()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const isDismissed = localStorage.getItem('kyro_docs_banner_dismissed') === 'true'
    if (isDismissed) {
      isVisible.value = false
      updateHeight()
    } else {
      nextTick(() => {
        if (banner.value) {
          observer = new ResizeObserver(updateHeight)
          observer.observe(banner.value)
          updateHeight()
        }
      })
    }
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
  if (typeof window !== 'undefined') {
    document.documentElement.style.removeProperty('--vp-layout-top-height')
  }
})
</script>

<style scoped>
.announcement-banner {
  background-color: #fffbbf;
  color: var(--vp-c-warning-text, #4b3e00);
  padding: 8px 40px 8px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--vp-c-warning-2, #e5c300);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
}
.dark .announcement-banner {
  background-color: #423500;
  color: var(--vp-c-warning-text, #fffbbf);
  border-bottom: 1px solid var(--vp-c-warning-2, #6b5500);
}
.announcement-banner p {
  margin: 0;
  line-height: 1.5;
}
.learn-more-link {
  display: inline-block;
  color: var(--vp-c-warning-text, #4b3e00) !important;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  font-weight: 600;
  font-size: 13px;
  transition: text-decoration-color 0.2s, opacity 0.2s;
  white-space: nowrap;
}
.learn-more-link:hover {
  text-decoration-color: currentColor;
  opacity: 0.8;
}
.dark .learn-more-link {
  color: var(--vp-c-warning-text, #fffbbf) !important;
}
.close-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  border-radius: 4px;
}
.close-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}
.dark .close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
