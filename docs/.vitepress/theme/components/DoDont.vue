<template>
  <div class="kyro-do-dont">
    <div class="kyro-do-dont-panel kyro-do">
      <div class="kyro-do-dont-label">DO</div>
      <slot name="do" />
    </div>
    <div class="kyro-do-dont-panel kyro-dont">
      <div class="kyro-do-dont-label">DON'T</div>
      <slot name="dont" />
    </div>
  </div>
</template>
