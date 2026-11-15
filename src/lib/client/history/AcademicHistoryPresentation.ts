import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import {
	TERM_SEASONS,
	type AcademicTerm,
	type HistoryCourseResponse,
	type HistoryStatus,
	type TermSeason
} from '#lib/contracts/AcademicHistoryContract.ts';

export const HISTORY_STATUS_LABELS: Record<HistoryStatus, () => string> = {
	planning: m.history_status_planning,
	taking: m.history_status_taking,
	took: m.history_status_took
};

export const TERM_SEASON_LABELS: Record<TermSeason, () => string> = {
	winter: m.term_season_winter,
	spring: m.term_season_spring,
	summer: m.term_season_summer,
	fall: m.term_season_fall
};

/** The fields the owner's and the public view of an entry share. */
export interface DisplayedHistoryEntry {
	id: string;
	course: HistoryCourseResponse;
	status: HistoryStatus;
	term: AcademicTerm | null;
}

export interface HistoryEntryGroup<Entry extends DisplayedHistoryEntry> {
	key: string;
	heading: string;
	entries: Entry[];
}

export function formatTerm(term: AcademicTerm): string {
	return m.history_term({ season: TERM_SEASON_LABELS[term.season](), year: term.year });
}

/** The term a student is most likely recording today: Spring until May, Summer, then Fall. */
export function currentTerm(today = new Date()): AcademicTerm {
	const month = today.getMonth();
	const season: TermSeason = month <= 4 ? 'spring' : month <= 6 ? 'summer' : 'fall';
	return { season, year: today.getFullYear() };
}

/** Seasons run winter, spring, summer, fall within a year, so later terms sort higher. */
function termOrder(term: AcademicTerm | null): number {
	if (!term) return Number.POSITIVE_INFINITY;
	return term.year * TERM_SEASONS.length + TERM_SEASONS.indexOf(term.season);
}

/**
 * Groups entries by term and school, newest term first, as profiles show them. Planning entries
 * without a term come first under their own heading.
 */
export function groupHistoryEntries<Entry extends DisplayedHistoryEntry>(
	entries: Entry[]
): HistoryEntryGroup<Entry>[] {
	const groups = new Map<string, HistoryEntryGroup<Entry> & { order: number }>();
	for (const entry of entries) {
		const institution = entry.course.institution;
		const key = `${entry.term ? `${entry.term.season}-${entry.term.year}` : 'unscheduled'}:${institution.id}`;
		const termLabel = entry.term ? formatTerm(entry.term) : m.history_group_unscheduled();
		let group = groups.get(key);
		if (!group) {
			group = {
				key,
				heading: m.history_group_heading({ term: termLabel, institution: institution.name }),
				entries: [],
				order: termOrder(entry.term)
			};
			groups.set(key, group);
		}
		group.entries.push(entry);
	}
	return [...groups.values()]
		.sort(
			(first, second) =>
				second.order - first.order || first.heading.localeCompare(second.heading, getLocale())
		)
		.map(({ key, heading, entries: groupEntries }) => ({
			key,
			heading,
			entries: groupEntries.sort((first, second) =>
				first.course.code.localeCompare(second.course.code)
			)
		}));
}
