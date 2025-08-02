<template>
  <canvas
    ref="canvas"
  />
</template>

<script setup>
import { onMounted, useTemplateRef } from 'vue'
import { Renderer } from './compute'

const canvas = useTemplateRef('canvas')
onMounted(async () => {
  const renderer = new Renderer(canvas.value)
  await renderer.init()
  renderer.compute()
})
</script>
