import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import Bot from "../managers/Bot";
import Embeds from "../util/Embeds";

export default class extends Command {
    public name = "invite";
    public description = "Invite the discord bot";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        const client = interaction.client as Bot;

        // Step 1, introduction & requesting api key
        const embed = client.embeds
            .base()
            .setDescription(
                "To invite the bot. Click [here](https://discord.com/oauth2/authorize?client_id=991303300395847751&permissions=395673939024&scope=bot%20applications.commands) to invite the bot."
            );
        interaction.reply({
            embeds: [embed],
        });
    }
}
