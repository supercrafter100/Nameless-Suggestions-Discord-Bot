import { Subcommand } from '@crystaldevelopment/command-handler/dist';
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from 'discord.js';
import Bot from '../../../managers/Bot';
import fetch from 'node-fetch';
import Database from '../../../database/Database';
import LanguageManager from '../../../managers/LanguageManager';
import { APIWebsiteInfo } from '../../../types';
import { nanoid } from 'nanoid';
import chalk from 'chalk';

export default class extends Subcommand {
    public name = 'apikey';
    public description = 'Set the api key of your website';
    public options = [
        {
            type: ApplicationCommandOptionType.String as number,
            name: 'apiurl',
            description: 'The api url of your website',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String as number,
            name: 'apikey',
            description: 'The api key of your website',
            required: true,
        },
    ];

    public onStart(): void {
        null;
    }

    public onLoad() {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        if (!process.env.DOMAIN) {
            interaction.reply('Something has gone terribly wrong. Environmental variables are not set!');
            return;
        }

        const apiurl = interaction.options.getString('apiurl', true);
        const apikey = interaction.options.getString('apikey', true);

        await interaction.deferReply({ ephemeral: true });

        const client = this.client as Bot;
        client.logger.debug('Fetching api info for api url', chalk.yellow(apiurl), 'and api key', chalk.yellow(apikey));

        // Check if the api url + key is valid
        const res = await fetch(`${apiurl}${apiurl.endsWith('/') ? '' : '/'}info`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apikey}`,
                'X-API-Key': `${apikey}`,
            },
        }).catch((e) => {
            client.logger.debug('Error fetching api info');
            client.logger.debug(e);
            return undefined;
        });

        if (!res || !res.ok) {
            client.logger.debug('Invalid api url or key');
            client.logger.debug(res);
            client.logger.debug(await res?.text());
            const str = await LanguageManager.getString(
                interaction.guildId,
                'commands.settings.set.apikey.invalid_key'
            );
            interaction.editReply({ content: str });
            return;
        }

        // Set the api key
        const guildData = await Database.getGuildData(interaction.guildId);
        guildData.set('apiurl', apiurl);
        guildData.set('apikey', apikey);
        await guildData.save();

        // Get website info
        const info = (await res.json()) as APIWebsiteInfo;
        const version = info.nameless_version;

        const majorVersionNumber = parseInt(version.split('.')[1]);
        client.logger.debug(
            'NamelessMC version',
            chalk.yellow(version),
            'major version number',
            chalk.yellow(majorVersionNumber)
        );
        if (majorVersionNumber >= 1) {
            // We can create webhooks on this website
            const token = nanoid();
            client.logger.debug('Creating webhook with token', chalk.yellow(token));

            // Set the new authorization key
            guildData.set('authorizationKey', token);
            await guildData.save();

            const url = process.env.DOMAIN + (process.env.DOMAIN.endsWith('/') ? '' : '/') + 'webhook/' + token;
            client.logger.debug('Webhook url', chalk.yellow(url));

            await (this.client as Bot).suggestionsApi.createWebhook(interaction.guildId, {
                name: 'Suggestions discord bot',
                url: url,
                events: [
                    'newSuggestion',
                    'newSuggestionComment',
                    'deleteSuggestion',
                    'deleteSuggestionComment',
                    'userSuggestionVote',
                    'updateSuggestion',
                ],
            });

            const str = await LanguageManager.getString(
                interaction.guildId,
                'commands.settings.set.apikey.success_2_1'
            );
            interaction.editReply({ content: str });
            return;
        }

        const str = await LanguageManager.getString(interaction.guildId, 'commands.settings.set.apikey.success');
        interaction.editReply({ content: str });
    }
}
