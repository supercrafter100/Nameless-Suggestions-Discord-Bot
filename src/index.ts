import dotenv from "dotenv";
import Logger from "./handlers/Logger";
import chalk from "chalk";
import { Options, GatewayIntentBits, ActivityType } from "discord.js";
import { Sequelize } from "sequelize";

dotenv.config();

// Setting up

const logger = new Logger();
logger.prefix = chalk.bold.redBright("MASTER");
const devmode = process.env.npm_lifecylce_event == "dev";

const logtype = devmode ? "warn" : "info";

const db = new Sequelize(process.env.DB_NAME!, process.env.DB_USER!, process.env.DB_PASS!, {
    host: process.env.DB_HOST,
    dialect: "mariadb",
    logging: false
});

logger.blank();
logger[logtype]("=================================");
logger[logtype](
    "Running bot in",
    devmode ? chalk.red("DEV") : chalk.green("PROD"),
    "mode"
);
logger[logtype]("=================================");
logger.blank();

export {
    db
}
// Don't import bot before db is initialized
import Bot from "./managers/Bot";
const client = new Bot({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
    }),
    presence: {
        activities: [
            {
                name: "Suggestions",
                type: ActivityType.Watching,
            },
        ],
    },
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
