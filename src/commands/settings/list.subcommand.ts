import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { ChatInputCommandInteraction } from "discord.js";
import Database from "../../database/Database";
import Bot from "../../managers/Bot";

export default class extends Subcommand {
    public name = "list";
    public description = "List all settings";
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const client = interaction.client as Bot;

        // Get all the data for this discord server
        const guildData = await Database.getGuildData(interaction.guildId);

        const apiurl = guildData.apiurl;
        const apikey = guildData.apikey;
        const authkey = guildData.authorizationKey;

        const suggestionChannelId = guildData.suggestionChannel;

        // Build the embed
        const embed = client.embeds.base();
        embed.setDescription(
            [
                `🌐 **Api url**: ${apiurl ? `\`${apiurl}\`` : "*Not set*"}`,
                `🔑 **API Key**: ${apikey ? `\`${apikey}\`` : "*Not set*"}`,
                `🔒 **Auth Key**: ${authkey ? `\`${authkey}\`` : "*Not set*"}`,
                `💬 **Suggestion Channel**: ${suggestionChannelId
                    ? `<#${suggestionChannelId}>`
                    : "*Not set*"
                }`,
            ].join("\n")
        );

        // Send the embed
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
