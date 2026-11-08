import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv, type Plugin } from 'vite';
import { buildContentSecurityPolicyDirectives } from './server/ContentSecurityPolicyDirectives.js';
import { attachSocketServer } from './server/SocketServerAttacher.js';

const socketServerDevPlugin: Plugin = {
	name: 'academic-platform-socket-server',
	configureServer(server) {
		if (server.httpServer) attachSocketServer(server.httpServer as import('node:http').Server);
	}
};

export default defineConfig(({ mode }) => ({
	plugins: [
		tailwindcss(),
		socketServerDevPlugin,
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			csp: {
				mode: 'auto',
				directives: buildContentSecurityPolicyDirectives(
					loadEnv(mode, process.cwd(), '').PUBLIC_CLERK_PUBLISHABLE_KEY
				)
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		passWithNoTests: true,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
}));
