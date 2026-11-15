/**
 * Class lists for Blueprint controls (docs/design/blueprint-handoff.md). They're functions rather
 * than components so links, buttons, and Bits UI triggers can share one look.
 */
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'destructive';

/** `regular` is the main action size; `compact` is for secondary actions in lists and toolbars. */
export type ButtonSize = 'regular' | 'compact';

const BUTTON_BASE =
	'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

// Touch targets stay at least 44px on phones; desktop controls may shrink to 40 or 36px.
const BUTTON_SIZES: Record<ButtonSize, string> = {
	regular: 'min-h-11 px-5 desktop:min-h-10',
	compact: 'min-h-11 px-4 text-sm desktop:min-h-9'
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	filled: 'bg-primary text-on-primary hover:bg-primary/90',
	tonal: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
	outlined: 'border border-outline text-primary hover:bg-primary/8',
	text: 'text-primary hover:bg-primary/8',
	destructive: 'bg-error text-on-error hover:bg-error/90'
};

export function buttonClass(variant: ButtonVariant, size: ButtonSize = 'regular'): string {
	return `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`;
}

/** Round icon-only button; the caller supplies an accessible label. */
export function iconButtonClass(): string {
	return 'inline-flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-on-surface/8';
}

/** Filter and channel chips: 8px radius, and selection shown by color alone, with no checkmark. */
export function filterChipClass(isSelected: boolean): string {
	return [
		'inline-flex min-h-9 shrink-0 items-center rounded-chip border px-4 text-sm transition-colors duration-150',
		isSelected
			? 'border-transparent bg-secondary-container font-semibold text-on-secondary-container'
			: 'border-outline text-on-surface hover:bg-on-surface/8'
	].join(' ');
}

export type StatusTone = 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success';

const STATUS_TONES: Record<StatusTone, string> = {
	neutral: 'bg-surface-container text-on-surface',
	primary: 'bg-primary-container text-on-primary-container',
	secondary: 'bg-secondary-container text-on-secondary-container',
	tertiary: 'bg-tertiary-container text-on-tertiary-container',
	success: 'bg-success-container text-on-success-container'
};

/** Status chips (course status, post type, Answered, Locked). Full radius, never interactive. */
export function statusChipClass(tone: StatusTone): string {
	return `inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${STATUS_TONES[tone]}`;
}
