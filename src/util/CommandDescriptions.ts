import LanguageManager from '../managers/LanguageManager';

const DEFAULT_LANGUAGE = 'en_UK';
let descriptions: Record<string, string> = {};
let loadedLanguage = DEFAULT_LANGUAGE;

/**
 * Load command descriptions from the language manager for a given language code.
 * Falls back to en_UK if the language file or key is missing.
 */
export function loadCommandDescriptions(language: string): void {
    const langData = LanguageManager.languages.get(language);
    const fallbackData = LanguageManager.languages.get(DEFAULT_LANGUAGE);

    const langDescs = (langData?.['command_descriptions'] as Record<string, string>) ?? {};
    const fallbackDescs = (fallbackData?.['command_descriptions'] as Record<string, string>) ?? {};

    descriptions = { ...fallbackDescs, ...langDescs };
    loadedLanguage = language;
}

export function getLoadedLanguage(): string {
    return loadedLanguage;
}

/**
 * Get a command description by key, falling back to the provided default.
 */
export function getCommandDescription(key: string, fallback: string): string {
    return descriptions[key] ?? fallback;
}

// Load en_UK by default at module load time (will be re-loaded after LanguageManager initializes)
loadCommandDescriptions(DEFAULT_LANGUAGE);
