import dotenv from 'dotenv';
import Logger from './handlers/Logger';
import chalk from 'chalk';
import { Options, GatewayIntentBits, ActivityType } from 'discord.js';
import { Sequelize } from 'sequelize';

dotenv.config();

// Setting up

const logger = new Logger();
logger.prefix = chalk.bold.redBright('MASTER');
const devmode = process.env.npm_lifecylce_event == 'dev';

const logtype = devmode ? 'warn' : 'info';

if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASS) {
    console.log('Required database environmental variables not set! Exiting!');
    process.exit(1);
}

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mariadb',
    logging: false,
});

logger.blank();
logger[logtype]('=================================');
logger[logtype]('Running bot in', devmode ? chalk.red('DEV') : chalk.green('PROD'), 'mode');
logger[logtype]('=================================');
logger.blank();

/**
 * Get configured activity from environment variables
 * Supports: PLAYING, LISTENING, WATCHING, COMPETING, STREAMING, CUSTOM
 */
function getConfiguredActivity(): { name: string; type: ActivityType; url?: string } | null {
    const typeEnv = process.env.BOT_ACTIVITY_TYPE;
    const message = process.env.BOT_ACTIVITY_MESSAGE;

    if (!typeEnv || !message) {
        logger.info('BOT_ACTIVITY_TYPE or BOT_ACTIVITY_MESSAGE not set; using default activity.');
        return { name: 'Suggestions', type: ActivityType.Watching };
    }

    const typeUpper = typeEnv.toUpperCase();

    switch (typeUpper) {
        case 'PLAYING':
            return { name: message, type: ActivityType.Playing };
        case 'LISTENING':
            return { name: message, type: ActivityType.Listening };
        case 'WATCHING':
            return { name: message, type: ActivityType.Watching };
        case 'COMPETING':
            return { name: message, type: ActivityType.Competing };
        case 'STREAMING': {
            const url = process.env.BOT_ACTIVITY_URL;
            if (!url) {
                logger.warn(
                    'BOT_ACTIVITY_TYPE is STREAMING but BOT_ACTIVITY_URL is not set. Using default Twitch URL.',
                );
                return { name: message, type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' };
            }
            return { name: message, type: ActivityType.Streaming, url };
        }
        case 'CUSTOM':
            return { name: message, type: ActivityType.Custom };
        default:
            logger.warn(
                `Invalid BOT_ACTIVITY_TYPE: '${typeEnv}'. Valid options: PLAYING, LISTENING, WATCHING, COMPETING, STREAMING, CUSTOM. Using default.`,
            );
            return { name: 'Suggestions', type: ActivityType.Watching };
    }
}

const configuredActivity = getConfiguredActivity();

export { db };
// Don't import bot before db is initialized
import Bot from './managers/Bot';
const client = new Bot({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
    }),
    presence: configuredActivity
        ? {
              activities: [configuredActivity],
          }
        : undefined,
});

if (client.devmode) {
    client.login(process.env.DEV_TOKEN ?? process.env.TOKEN);
} else {
    client.login(process.env.TOKEN);
}

// Try to catch errors and stop the process from crashing
process.on('uncaughtException', (err) => console.log(err));
process.on('unhandledRejection', (err) => console.log(err));

export default client;
