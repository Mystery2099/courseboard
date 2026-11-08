const ONE_YEAR_IN_SECONDS = 31_536_000;

/**
 * Response headers applied to every response. The Content Security Policy is configured
 * separately through SvelteKit's `csp` option so that its inline scripts receive nonces.
 */
export class SecurityHeaderPolicy {
	static apply(headers: Headers, isSecureRequest: boolean): void {
		headers.set('X-Content-Type-Options', 'nosniff');
		headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		headers.set('X-Frame-Options', 'DENY');
		headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
		if (isSecureRequest) {
			headers.set('Strict-Transport-Security', `max-age=${ONE_YEAR_IN_SECONDS}`);
		}
	}
}
