<template>
  <div class="custom-block" :class="type">
    <p class="custom-block-title">{{ title }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  type: { type: String, default: "info" },
  title: { type: String, default: "" },
});
</script>
