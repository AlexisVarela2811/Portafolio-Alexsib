/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				canvas: 'var(--matrix-canvas)',
				surface: 'var(--matrix-surface)',
				ink: 'var(--matrix-text)',
				muted: 'var(--matrix-muted)',
				accent: 'var(--matrix-accent)',
				line: 'var(--matrix-border)',
			},
		},
	},
	plugins: [],
}
