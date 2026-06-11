import { Subcommand } from '@crystaldevelopment/command-handler/dist';
import { getCommandDescription } from '../../../util/CommandDescriptions';
import { ChatInputCommandInteraction } from 'discord.js';
import Database from '../../../database/Database';
import Bot from '../../../managers/Bot';
import LanguageManager from '../../../managers/LanguageManager';

export default class extends Subcommand {
    public name = 'reactions';
    public get description() {
        return getCommandDescription('settings_set_reactions', 'Toggle reaction buttons on/off');
    }
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        const client = interaction.client as Bot;

        // Get the current guild data
        const guildData = await Database.getGuildData(interaction.guildId);

        // Toggle the reactionsDisabled setting
        const newValue = !guildData.reactionsDisabled;
        await guildData.update({ reactionsDisabled: newValue });

        // Build the embed
        const embed = client.embeds.base();
        const statusKey = newValue
            ? 'commands.settings.set.reactions.disabled'
            : 'commands.settings.set.reactions.enabled';
        const str = await LanguageManager.getString(interaction.guildId, statusKey);
        embed.setDescription(`✅ ${str}`);

        // Send the embed
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
