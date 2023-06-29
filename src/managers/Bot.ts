import chalk from 'chalk';
import Discord from 'discord.js';
import Logger from '../handlers/Logger';
import EventHandler from '../handlers/EventHandler';
import { CommandHandler } from '@crystaldevelopment/command-handler';
import Embeds from '../util/Embeds';
import Webserver from './Webserver';
import { join } from 'path';
import SuggestionHandler from './SuggestionHandler';
import SuggestionApiHandler from './SuggestionApiHandler';
import { db } from '..';
import LanguageManager from './LanguageManager';
import Guild from '../database/models/guild.model';
import Redis from 'ioredis';
import Database from '../database/Database.js';

export default class Bot extends Discord.Client<true> {
    //      Handlers

    public readonly commands = new CommandHandler(this, {
        guildId: process.env.GUILDID,
        createCommands: true,
        updateCommands: true,
        deleteCommands: true,
    });
    public readonly events = new EventHandler(this);

    //      Util

    public readonly redis;
    public readonly logger = new Logger();
    public readonly embeds = new Embeds(this);
    public readonly webserver;
    public readonly suggestions;
    public readonly suggestionsApi;

    //      Misc

    public readonly extension: string;
    public readonly devmode: boolean;

    constructor(options: Discord.ClientOptions) {
        super(options);

        this.webserver = new Webserver(this);
        this.suggestions = new SuggestionHandler(this);
        this.suggestionsApi = new SuggestionApiHandler(this);
        this.redis = new Redis({
            host: process.env.redis_host,
            port: parseInt(process.env.redis_port ?? '6379'),
            password: process.env.redis_password,
        });

        this.logger.prefix = chalk.green('BOT');
        this.devmode = process.env.npm_lifecycle_event == 'dev';
        this.extension = this.devmode ? '.ts' : '.js';
        this.logger.info('Starting bot...');
        this.start();
    }

    private async start() {
        await this.events.start();
        this.startStdinListener();
        this.webserver.start();
        this.events.load(join(__dirname, '../events'));
        this.commands.loadFromDirectory(join(__dirname, '../commands'));
        db.sync();
        LanguageManager.loadLanguages(join(__dirname, '../language'));

        this.suggestionsApi.loadApiVersions();
        this.suggestions.loadHandlerVersions();
    }

    private async startStdinListener() {
        process.stdin.on('data', async (data) => {
            const input = data.toString().trim();
            const args = input.split(/ +/g);
            const command = args.shift();

            if (command == 'sendreminder') {
                const allGuilds = await Guild.findAll();
                for (const dbGuild of allGuilds) {
                    const guild = await this.guilds.fetch(dbGuild.id).catch((err) => this.logger.warn(err));
                    if (guild) {
                        const guildOwner = await this.users.fetch(guild.ownerId);
                        if (!guildOwner) {
                            this.logger.warn(
                                'Guild owner of the guild ' +
                                    chalk.yellow(guild.name) +
                                    ' cannot be found... Deleted user?'
                            );
                            continue;
                        }

                        const embed = this.embeds.base();
                        embed.setDescription(
                            `Hello there ${guildOwner.toString()}!\n\nRecently this bot has been updated to use the latest features of NamelessMC. With the introduction of NamelessMC v2.0.0, a new webhook type has been added that allows this bot to use a lot more data in the future. This is why it has been modified to support this webhook type.\n\nPlease go to \`StaffCP > Configuration > Webhooks\` and find the webhook you set up for this discord bot. Click the edit button next to it and then change the webhook type to \`Normal\`. Once you've done this, save the webhook and you're all set!\n\nA huge thank you for using this bot. Please make sure that you keep the suggestion module from Partydragen updated as well so you can use all the latest features this bot provides you with. Thank you for using the bot and good luck with your server!`
                        );
                        guildOwner.send({ embeds: [embed] }).catch((err) => this.logger.warn(err));
                    }
                }
            }

            if (command == 'getsiteversions') {
                const allGuilds = await Guild.findAll();
                for (const dbGuild of allGuilds) {
                    const guild = await this.guilds
                        .fetch(dbGuild.id)
                        .catch(() =>
                            this.logger.warn(`Could not fetch guild info for ${dbGuild.id}, am I not in it anymore?`)
                        );
                    if (guild) {
                        if (!dbGuild.apikey || !dbGuild.apiurl) {
                            this.logger.warn(`No api key configured for ${guild.name} (${guild.id})`);
                            continue;
                        }

                        // Fetch website info
                        const credentials = await Database.getApiCredentials(guild.id);
                        if (!credentials) {
                            this.logger.warn(`No api credentials found for ${guild.name} (${guild.id})`);
                            continue;
                        }

                        const websiteInfo = await (
                            await this.suggestionsApi.getApi(guild.id)
                        ).getWebsiteInfo(credentials);
                        if (!websiteInfo) {
                            this.logger.warn(`No website info found for ${guild.name} (${guild.id})`);
                            continue;
                        }

                        this.logger.info(
                            `${guild.name} (${guild.id}) is running NamelessMC Version ${websiteInfo.nameless_version}`
                        );
                    }
                }
            }
        });
    }
}
