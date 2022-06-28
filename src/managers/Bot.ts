import chalk from "chalk";
import Discord from "discord.js";
import Logger from "../handlers/Logger";
import EventHandler from "../handlers/EventHandler";
import { CommandHandler } from "@crystaldevelopment/command-handler";
import Embeds from "../util/Embeds";
import Webserver from "./Webserver";
import { join } from "path";
import SuggestionHandler from "./SuggestionHandler";
import SuggestionApiHandler from "./SuggestionApiHandler";
import { db } from "..";

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

        this.logger.prefix = chalk.green("BOT");
        this.devmode = process.env.npm_lifecycle_event == "dev";
        this.extension = this.devmode ? ".ts" : ".js";
        this.logger.info("Starting bot...");
        this.start();
    }

    private async start() {
        await this.events.start();
        this.startStdinListener();
        this.webserver.start();
        this.events.load(join(__dirname, "../events"));
        this.commands.loadFromDirectory(join(__dirname, "../commands"));
        db.sync();
    }

    private async startStdinListener() {
        process.stdin.on("data", (data) => {
            const input = data.toString().trim();
            const args = input.split(/ +/g);
            const command = args.shift();

            if (command == "migrate") {
                const guild = args[0];
                if (!guild) {
                    this.logger.error("No guild specified");
                    return;
                }

                this.logger.info(`Migrating suggestions for guild ${guild}`);
                this.suggestions.sendAllSuggestions(guild);
            }
        })
    }
}
