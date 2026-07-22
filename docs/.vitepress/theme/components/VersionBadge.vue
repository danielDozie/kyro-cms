<template>
  <span class="kyro-version-badge" :class="type">{{ version }}</span>
</template>

<script setup>
defineProps({
  version: { type: String, required: true },
  type: { type: String, default: "added" },
});
</script>
