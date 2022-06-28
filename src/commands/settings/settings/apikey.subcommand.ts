import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { CommandInteraction } from "discord.js";
import Bot from "../../../managers/Bot";
import fetch from "node-fetch";
import Guild from "../../../database/models/guild.model";
import Database from "../../../database/Database";

export default class extends Subcommand {
    public name = "apikey";
    public description = "Set the api key of your website";
    public options = [
        {
            type: ApplicationCommandOptionType.String as number,
            name: "apiurl",
            description: "The api url of your website",
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String as number,
            name: "apikey",
            description: "The api key of your website",
            required: true,
        },
    ];

    public onStart(): void {
        null;
    }

    public onLoad() {
        null;
    }

    public async run(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const apiurl = interaction.options.getString("apiurl")!;
        const apikey = interaction.options.getString("apikey")!;

        // Check if the api url + key is valid
        const res = await fetch(
            `${apiurl}${apiurl.endsWith("/") ? "" : "/"}info`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apikey}`,
                },
            }
        ).catch(() => undefined);

        if (!res || !res.ok) {
            interaction.reply("The api url or api key is invalid");
            return;
        }

        // Set the api key
        const guildData = await Database.getGuildData(interaction.guildId);
        guildData.set("apiurl", apiurl);
        guildData.set("apikey", apikey);
        await guildData.save();

        interaction.reply("The api key has been set");
    }
}
