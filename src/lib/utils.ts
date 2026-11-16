import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Blueprint's own theme names (layout.css), so merging never mistakes one for a color or weight.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			font: ['sans', 'heading', 'reading', 'mono'],
			radius: ['chip', 'field', 'tile', 'card', 'sheet'],
			shadow: ['floating', 'dialog'],
			breakpoint: ['tablet', 'desktop', 'wide']
		},
		classGroups: {
			'font-size': ['text-overline', 'text-headline']
		}
	}
});

/** Joins class lists and lets later Tailwind classes override earlier ones (shadcn-svelte convention). */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
