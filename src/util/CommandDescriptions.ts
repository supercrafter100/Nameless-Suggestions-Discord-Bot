import path from 'path';
import fs from 'fs';

const DEFAULT_LANGUAGE = 'en_UK';
let descriptions: Record<string, string> = {};

/**
 * Load command descriptions from the language file for a given language code.
 * Falls back to en_UK if the language file or key is missing.
 */
export function loadCommandDescriptions(language: string): void {
    const langPath = path.join(__dirname, '../language', `${language}.json`);
    const fallbackPath = path.join(__dirname, '../language', `${DEFAULT_LANGUAGE}.json`);

    let langData: Record<string, unknown> = {};
    let fallbackData: Record<string, unknown> = {};

    try {
        langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    } catch {
        // language file not found, will use fallback
    }

    try {
        fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
    } catch {
        // fallback not found either
    }

    const langDescs = (langData['command_descriptions'] as Record<string, string>) ?? {};
    const fallbackDescs = (fallbackData['command_descriptions'] as Record<string, string>) ?? {};

    descriptions = { ...fallbackDescs, ...langDescs };
}

/**
 * Get a command description by key, falling back to the provided default.
 */
export function getCommandDescription(key: string, fallback: string): string {
    return descriptions[key] ?? fallback;
}

// Load en_UK by default at module load time
loadCommandDescriptions(DEFAULT_LANGUAGE);
