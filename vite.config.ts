import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tamaguiPlugin } from '@tamagui/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tamaguiPlugin({
      config: './src/tamagui.config.ts',
      components: ['tamagui'],
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
