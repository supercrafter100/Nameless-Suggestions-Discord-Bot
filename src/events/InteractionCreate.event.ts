import { CommandInteraction, Interaction } from 'discord.js';
import Bot from '../managers/Bot';
import { Event } from '../handlers/EventHandler';
import LanguageManager from '../managers/LanguageManager';
import Database from '../database/Database';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public async run(interaction: Interaction) {
        if (interaction.isCommand()) return this.client.commands.runCommand(interaction as CommandInteraction);

        if (interaction.isButton() && ['like-suggestion', 'dislike-suggestion'].includes(interaction.customId)) {
            // Check if reactions are disabled in database settings
            if (interaction.guildId) {
                const guildData = await Database.getGuildData(interaction.guildId);
                if (guildData.reactionsDisabled) {
                    const str = await LanguageManager.getString(
                        interaction.guildId,
                        'suggestionHandler.reacting_disabled',
                    );
                    const embed = (this.client as Bot).embeds.base().setDescription(str);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
            }
            this.client.suggestions.handleButtonInteraction(
                interaction,
                interaction.customId === 'like-suggestion' ? 'like' : 'dislike',
            );
        }
    }
}
