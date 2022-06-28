import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import fetch from "node-fetch";

export default class extends Command {
    public name = "suggest";
    public description = "Suggest something!";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        // TODO: open modal and do stuff
        interaction.reply("Suggestion modal here");
    }
}
