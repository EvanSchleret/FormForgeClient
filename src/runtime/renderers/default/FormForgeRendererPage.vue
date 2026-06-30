<script setup lang="ts">
import type { FormForgePageSchema } from '../../types'
import { sanitizeFormForgeRichText } from '../../utils/rich-text'

interface Props {
  page: FormForgePageSchema
}

defineProps<Props>()
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="page.title !== '' || (typeof page.description === 'string' && page.description !== '')"
      class="space-y-1"
    >
      <h3
        v-if="page.title !== ''"
        class="text-base font-semibold text-default"
      >
        {{ page.title }}
      </h3>
      <div
        v-if="typeof page.description === 'string' && page.description !== ''"
        class="formforge-rich-text text-sm text-muted"
        v-html="sanitizeFormForgeRichText(page.description)"
      />
    </div>

    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>
