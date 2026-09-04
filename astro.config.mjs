// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
const { PUBLIC_SITE_URL } = loadEnv('production', '.', '');
const site = PUBLIC_SITE_URL || 'https://alexsibdev.netlify.app/';

export default defineConfig({
  site,
  integrations: [tailwind()]
});
