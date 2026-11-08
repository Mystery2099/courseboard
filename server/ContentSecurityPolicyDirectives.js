const CLOUDFLARE_TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const CLERK_IMAGE_ORIGIN = 'https://img.clerk.com';
const CLERK_BOT_PROTECTION_SCRIPT_ORIGIN = 'https://cdn.protect.clerk.com';
// Bot protection probes and frames use generated subdomains and several ports.
const CLERK_BOT_PROTECTION_PROBE_SOURCE = 'https://*.protect.clerk.com:*';

/**
 * Decodes the Clerk Frontend API origin from a publishable key (`pk_<test|live>_` followed by
 * base64 of `<host>$`). Clerk loads its scripts and makes its requests through that host.
 *
 * @param {string | undefined} publishableKey
 * @returns {`https://${string}.${string}` | null} null when the key is missing or a placeholder
 */
export function resolveClerkFrontendApiOrigin(publishableKey) {
	const match = /^pk_(?:test|live)_([A-Za-z0-9+/=]+)$/.exec(publishableKey ?? '');
	if (!match) return null;
	const decodedKey = Buffer.from(match[1], 'base64').toString('utf8');
	if (!decodedKey.endsWith('$')) return null;
	const host = decodedKey.slice(0, -1);
	return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)
		? /** @type {`https://${string}.${string}`} */ (`https://${host}`)
		: null;
}

/**
 * Content Security Policy directives for SvelteKit's `csp` option, which adds nonces for its own
 * inline scripts. The policy is fixed at build time, so changing the Clerk publishable key
 * requires a rebuild.
 *
 * @param {string | undefined} clerkPublishableKey
 * @returns {NonNullable<NonNullable<import('@sveltejs/kit/vite').Config['csp']>['directives']>}
 */
export function buildContentSecurityPolicyDirectives(clerkPublishableKey) {
	const clerkFrontendApiOrigin = resolveClerkFrontendApiOrigin(clerkPublishableKey);
	if (!clerkFrontendApiOrigin) {
		console.warn('No valid Clerk publishable key at build time; the CSP will block Clerk.');
	}
	const clerkOrigins = clerkFrontendApiOrigin ? [clerkFrontendApiOrigin] : [];
	return {
		'default-src': ['self'],
		'script-src': [
			'self',
			...clerkOrigins,
			CLERK_BOT_PROTECTION_SCRIPT_ORIGIN,
			CLOUDFLARE_TURNSTILE_ORIGIN
		],
		// Same-origin WebSocket connections are covered by 'self'.
		'connect-src': ['self', ...clerkOrigins, CLERK_BOT_PROTECTION_PROBE_SOURCE],
		'img-src': ['self', 'data:', CLERK_IMAGE_ORIGIN],
		'style-src': ['self', 'unsafe-inline'],
		'font-src': ['self'],
		'frame-src': [CLERK_BOT_PROTECTION_PROBE_SOURCE, CLOUDFLARE_TURNSTILE_ORIGIN],
		'worker-src': ['self', 'blob:'],
		'object-src': ['none'],
		'base-uri': ['self'],
		'form-action': ['self'],
		'frame-ancestors': ['none']
	};
}
