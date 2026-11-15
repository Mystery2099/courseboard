<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, isLocale, locales, setLocale } from '#lib/paraglide/runtime.js';

	/** Hide the label where a heading already names the setting. */
	let { isLabelVisible = true }: { isLabelVisible?: boolean } = $props();

	/** Each language is named in itself, so someone who can't read the current one still finds theirs. */
	function nativeLanguageName(locale: string): string {
		const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
		return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
	}
</script>

<label class="flex items-center gap-2 text-sm">
	<span class={isLabelVisible ? 'font-semibold' : 'sr-only'}>{m.language_picker_label()}</span>
	<select
		class="rounded-2xl border-slate-300 py-1.5 pr-8 pl-3 text-sm"
		value={getLocale()}
		onchange={(event) => {
			const locale = event.currentTarget.value;
			if (isLocale(locale)) setLocale(locale);
		}}
	>
		{#each locales as locale (locale)}
			<option value={locale} lang={locale}>{nativeLanguageName(locale)}</option>
		{/each}
	</select>
</label>
