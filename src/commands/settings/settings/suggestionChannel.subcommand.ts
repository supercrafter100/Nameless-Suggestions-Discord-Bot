import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { CommandInteraction, TextChannel } from "discord.js";
import { ApplicationCommandOptionType } from "discord-api-types";
import { nanoid } from "nanoid";
import Bot from "../../../managers/Bot";
import Database from "../../../database/Database";
import Suggestion from "../../../database/models/suggestion.model";

export default class extends Subcommand {
    public name = "suggestionchannel";
    public description = "Set the suggestionchannel where new suggestions get sent in.";
    public options = [
        {
            type: ApplicationCommandOptionType.Channel as number,
            name: "channel",
            description: "The suggestion channel",
            required: true,
        }
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

        const channel = interaction.options.getChannel("channel")!;
        if (!(channel instanceof TextChannel)) {
            interaction.reply("The channel must be a text channel (and not a news channel)");
            return;
        }

        // Set the new authorization key
        const guildData = await Database.getGuildData(interaction.guildId);
        if (guildData.suggestionChannel) {
            await Suggestion.destroy({ where: { channelId: guildData.suggestionChannel } });
        }
        
        guildData.set("suggestionChannel", channel.id);
        await guildData.save()

        interaction.reply(
            `the suggestion channel has been changed to ${channel.toString()}.`
        );
    }
}
