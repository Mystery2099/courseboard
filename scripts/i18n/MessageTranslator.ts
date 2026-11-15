/**
 * Fills messages missing from each locale with Gemini through the Antigravity CLI (`agy`), using
 * messages/translation-guide.md. Translations that change placeholders, whitespace, or variant
 * structure are reported and left missing. Run from the project root:
 *
 *   pnpm i18n:translate            every locale
 *   pnpm i18n:translate es         only Spanish
 *
 * AGY_BIN and AGY_MODEL override the CLI path and model.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { format, resolveConfig } from 'prettier';
import { fromTranslatedMessage, toTranslatableMessage } from './TranslatableMessage.ts';
import { findTranslationProblem, type MessageValue } from './TranslationValidator.ts';

type MessageCatalog = Record<string, MessageValue>;

const BATCH_SIZE = 40;
const AGY_BIN = process.env.AGY_BIN ?? 'agy';
const AGY_MODEL = process.env.AGY_MODEL ?? 'gemini-3.8-flash-high';
const SCHEMA_KEY = '$schema';
const RESPONSE_SCHEMA = {
	type: 'object',
	properties: { translations: { type: 'object' } },
	required: ['translations']
};

const runCommand = promisify(execFile);

interface ProjectSettings {
	baseLocale: string;
	locales: string[];
	'plugin.inlang.messageFormat': { pathPattern: string };
}

class MessageCatalogFile {
	constructor(private readonly filePath: string) {}

	static forLocale(settings: ProjectSettings, locale: string): MessageCatalogFile {
		const pattern = settings['plugin.inlang.messageFormat'].pathPattern;
		return new MessageCatalogFile(path.resolve(pattern.replace('{locale}', locale)));
	}

	/** A malformed or unreadable catalog stops the run, so existing translations are never lost. */
	async read(): Promise<Record<string, unknown>> {
		return JSON.parse(await readFile(this.filePath, 'utf8'));
	}

	/** A new locale has no catalog yet; only a missing file counts as empty. */
	async readOrEmpty(): Promise<Record<string, unknown>> {
		try {
			return await this.read();
		} catch (cause) {
			if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return {};
			throw cause;
		}
	}

	/** Writes the messages in the base locale's key order, so diffs stay readable. */
	async write(
		schema: unknown,
		messages: Record<string, unknown>,
		keyOrder: string[]
	): Promise<void> {
		const ordered: Record<string, unknown> = { [SCHEMA_KEY]: schema };
		for (const key of keyOrder) if (key in messages) ordered[key] = messages[key];
		const options = await resolveConfig(this.filePath);
		const json = await format(JSON.stringify(ordered), { ...options, filepath: this.filePath });
		await writeFile(this.filePath, json);
	}
}

class GeminiTranslationClient {
	constructor(private readonly guide: string) {}

	async translate(
		locale: string,
		batch: Record<string, unknown>
	): Promise<Record<string, unknown>> {
		const prompt = [
			`Translate the user interface messages below from English into the locale "${locale}".`,
			'Follow the translation guide exactly. Do not use any tools or read any files.',
			'Return {"translations": {...}} with exactly the same keys. A string stays a string. An',
			'object holds a plural message by CLDR plural category, such as {"one": "...", "other":',
			'"..."}: return a translation for every category the language needs, always including',
			'"other".',
			'',
			'<translation-guide>',
			this.guide,
			'</translation-guide>',
			'',
			'<messages>',
			JSON.stringify(batch, null, 2),
			'</messages>'
		].join('\n');

		// An empty working directory keeps the agent away from the repository.
		const workingDirectory = await mkdtemp(path.join(tmpdir(), 'message-translator-'));
		try {
			const schemaPath = path.join(workingDirectory, 'schema.json');
			await writeFile(schemaPath, JSON.stringify(RESPONSE_SCHEMA));
			const { stdout } = await runCommand(
				AGY_BIN,
				[
					'--model',
					AGY_MODEL,
					'--output-format',
					'json',
					'--json-schema',
					schemaPath,
					'--disable-slash-commands',
					'--print-timeout',
					'300s',
					`--print=${prompt}`
				],
				{ cwd: workingDirectory, maxBuffer: 16 * 1024 * 1024 }
			);
			const result = JSON.parse(stdout);
			if (result.status !== 'SUCCESS') throw new Error(`agy returned ${result.status}`);
			return result.structured_output.translations;
		} finally {
			await rm(workingDirectory, { recursive: true, force: true });
		}
	}
}

async function translateLocale(
	locale: string,
	sourceMessages: MessageCatalog,
	schema: unknown,
	catalogFile: MessageCatalogFile,
	client: GeminiTranslationClient
): Promise<number> {
	const targetMessages = await catalogFile.readOrEmpty();
	const missingKeys = Object.keys(sourceMessages).filter((key) => {
		const value = targetMessages[key];
		return value === undefined || (typeof value === 'string' && value.trim() === '');
	});
	if (missingKeys.length === 0) {
		console.log(`${locale}: nothing to translate`);
		return 0;
	}

	let rejectedCount = 0;
	for (let start = 0; start < missingKeys.length; start += BATCH_SIZE) {
		const batchKeys = missingKeys.slice(start, start + BATCH_SIZE);
		const batch = Object.fromEntries(
			batchKeys.map((key) => [key, toTranslatableMessage(sourceMessages[key])])
		);
		console.log(`${locale}: translating ${batchKeys.length} messages…`);
		const translations = await client.translate(locale, batch);
		for (const key of batchKeys) {
			const translation = fromTranslatedMessage(sourceMessages[key], translations[key]);
			const problem = findTranslationProblem(sourceMessages[key], translation);
			if (problem) {
				rejectedCount++;
				console.warn(
					`${locale}: skipped ${key}: ${problem}\n  received ${JSON.stringify(translations[key])}`
				);
			} else {
				targetMessages[key] = translation;
			}
		}
	}
	await catalogFile.write(schema, targetMessages, Object.keys(sourceMessages));
	console.log(`${locale}: added ${missingKeys.length - rejectedCount} messages`);
	return rejectedCount;
}

async function main(): Promise<void> {
	const settings: ProjectSettings = JSON.parse(
		await readFile('project.inlang/settings.json', 'utf8')
	);
	const requestedLocales = process.argv.slice(2);
	const targetLocales = settings.locales.filter(
		(locale) =>
			locale !== settings.baseLocale &&
			(requestedLocales.length === 0 || requestedLocales.includes(locale))
	);
	const { [SCHEMA_KEY]: schema, ...sourceMessages } = await MessageCatalogFile.forLocale(
		settings,
		settings.baseLocale
	).read();
	const client = new GeminiTranslationClient(
		await readFile('messages/translation-guide.md', 'utf8')
	);

	let rejectedCount = 0;
	for (const locale of targetLocales) {
		rejectedCount += await translateLocale(
			locale,
			sourceMessages as MessageCatalog,
			schema,
			MessageCatalogFile.forLocale(settings, locale),
			client
		);
	}
	if (rejectedCount > 0) {
		console.warn(`${rejectedCount} translations were skipped; translate them by hand.`);
		process.exitCode = 1;
	}
}

await main();
