import chalk from "chalk";
import { Collection } from "discord.js";
import fs from 'fs';
import path from "path";
import Database from "../database/Database";
import Logger from "../handlers/Logger";

const DEFAULT_LANGUAGE = "en_UK"

export default class LanguageManager {
	public static languages: Collection<string, any> = new Collection();
    private static logger = new Logger()
	public static languageMap = {
		"Czech": "cs_CZ",
		"German": "de_DE",
		"Greek": "el_GR",
		"EnglishUK": "en_UK",
		"EnglishUS": "en_US",
		"Spanish": "es_419",
		"SpanishES": "es_ES",
		"French": "fr_FR",
		"Hungarian": "hu_HU",
		"Italian": "it_IT",
		"Lithuanian": "lt_LT",
		"Norwegian": "nb_NO",
		"Dutch": "nl_NL",
		"Polish": "pl_PL",
		"Romanian": "ro_RO",
		"Russian": "ru_RU",
		"Slovak": "sk_SK",
		"Turkish": "tr_TR",
		"Chinese(Traditional)": "zh_TW",
		"Chinese(Simplified)": "zh_CN",
		"Portuguese": "pt_BR"
	}

	public static loadLanguages(dir: string) {
        LanguageManager.logger.prefix = chalk.blue("LANG");

		const languageFiles = fs.readdirSync(dir);
		for (const languageFile of languageFiles) {
			const file = fs.readFileSync(path.join(dir, languageFile), 'utf8');
			try {
				const json = JSON.parse(file);
				if (!json) continue;

				this.languages.set(languageFile.split('.')[0], json);
                LanguageManager.logger.debug(`Loaded language file: ${languageFile}`);
			} catch (ignored) {}
		}
	}

	public static async getString(guildId: string, key: string, ...placeholders: string[]) : Promise<string | undefined> {
		

		const language = await this.getLanguage(guildId);
		let translations = this.languages.get(language);
		
		let translation = this.getTranslation(translations, key);
		if (!translation) {
			translations = this.languages.get(DEFAULT_LANGUAGE);
			translation = this.getTranslation(translations, key);
		}
		
		if (!translation) {
			// We are already the default translation so the term is not set
			console.log("[LANG]"+ `Term '${key}' is missing from default (${DEFAULT_LANGUAGE}) translation`)
			return undefined;
		}

		for (let i = 0; i < placeholders.length; i += 2) {
			const k = placeholders[i];
			const v = placeholders[i + 1];
			
			translation = translation.split("{" + k + "}").join(v); // .replaceAll doesn't exist so I guess we use this
		}

		return translation;
	}

	private static getTranslation(json: any, key: string) {
		const keys = key.split('.');
		let result = json;

		for (const k of keys) {
			result = result[k];
			if (!result) {
				LanguageManager.logger.warn(`No language key found for: ${key} in language ${[...this.languages.entries()].filter(({ 1: v}) => v === json).map(([k]) => k)[0]}`);
				return undefined;
			}
		}
		return result;
	}

	private static async getLanguage(guildId: string) {
        const guildData = await Database.getGuildData(guildId);
		return guildData.language;
    }
}