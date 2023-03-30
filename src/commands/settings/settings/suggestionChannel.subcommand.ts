import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, TextChannel } from "discord.js";
import Database from "../../../database/Database";
import Suggestion from "../../../database/models/suggestion.model";
import LanguageManager from "../../../managers/LanguageManager";

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

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const channel = interaction.options.getChannel("channel")!;
        if (!(channel instanceof TextChannel)) {
            const str = await LanguageManager.getString(interaction.guildId, "commands.settings.set.suggestionChannel.no_textchannel");
            interaction.reply({ content: str, ephemeral: true });
            return;
        }

        // Set the new authorization key
        const guildData = await Database.getGuildData(interaction.guildId);
        if (guildData.suggestionChannel) {
            await Suggestion.destroy({ where: { channelId: guildData.suggestionChannel } });
        }

        guildData.set("suggestionChannel", channel.id);
        await guildData.save()

        const str = await LanguageManager.getString(interaction.guildId, "commands.settings.set.suggestionChannel.success", "channel", channel.toString());
        interaction.reply({ content: str, ephemeral: true });
    }
}
