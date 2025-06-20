import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
import glsl from 'vite-plugin-glsl'

const fullReloadAlways: Plugin = {
  name: 'full-reload',
  handleHotUpdate({ server }) {
    server.ws.send({ type: 'full-reload' })
    return []
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [vue(), glsl(), fullReloadAlways],
})
