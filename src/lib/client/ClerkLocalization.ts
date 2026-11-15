import { enUS, esES } from '@clerk/localizations';
import type { Locale } from '#lib/paraglide/runtime.js';

/** Clerk's own sign-in and account screens, per app locale. A new locale must be added here. */
export const CLERK_LOCALIZATIONS: Record<Locale, typeof enUS> = {
	en: enUS,
	es: esES
};
