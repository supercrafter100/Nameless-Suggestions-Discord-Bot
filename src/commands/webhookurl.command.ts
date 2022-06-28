import { Command } from "@crystaldevelopment/command-handler/dist";
import {
    ApplicationCommandOptionData,
    CommandInteraction,
    GuildMember,
} from "discord.js";
import Database from "../database/Database";
import Guild from "../database/models/guild.model";
import Bot from "../managers/Bot";

export default class extends Command {
    public name = "webhookurl";
    public description = "Get the webhook url for your website!";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply("This command can only be used in a server");
            return;
        }
        if (!(interaction.member instanceof GuildMember)) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        if (!interaction.member.permissions.has("MANAGE_GUILD")) {
            await interaction.reply(
                'You do not have the required "Manage Guild" permission'
            );
            return;
        }

        const client = interaction.client as Bot;
        const guildData = await Database.getGuildData(interaction.guildId);
        const token = guildData?.authorizationKey;

        if (!token) {
            await interaction.reply(
                "You need to generate an authorization token first using `/settings authkey`"
            );
            return;
        }

        const url =
            process.env.DOMAIN! +
            (process.env.DOMAIN!.endsWith("/") ? "" : "/") +
            "webhook/" +
            token;

        const embed = client.embeds.base();
        embed.setDescription(
            `The url is: \`${url}\`.\nPlease use this url as the discord webhook url for the suggestions module.`
        );
        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }
}
