<template>
  <div class="bg-zinc-100/95 backdrop-blur-sm border-b border-zinc-200/80 px-3 sm:px-4 py-2 sm:py-3">
    <div class="max-w-5xl mx-auto">
      <input
        :value="modelValue"
        type="search"
        enterkeyhint="search"
        class="input-touch w-full px-4 border border-zinc-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
        placeholder="Buscar código ou descrição"
        autocomplete="off"
        maxlength="100"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
