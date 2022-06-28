import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { CommandInteraction } from "discord.js";
import Bot from "../../../managers/Bot";
import { nanoid } from "nanoid";
import Database from "../../../database/Database";

export default class extends Subcommand {
    public name = "authkey";
    public description = "Generate a new authorization key for the webhook ";
    public options = [];

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

        const token = nanoid();

        // Set the new authorization key
        const guildData = await Database.getGuildData(interaction.guildId);
        guildData.set("authorizationKey", token)
        await guildData.save()

        interaction.reply(
            `the authorization token has been changed to \`${token}\`. You can find a new webhook url by using the \`/webhookurl\` command.`
        );
    }
}
