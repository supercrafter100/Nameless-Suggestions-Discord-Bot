import { CommandInteraction, Interaction } from 'discord.js';
import { Event } from '../handlers/EventHandler';
import LanguageManager from '../managers/LanguageManager';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public async run(interaction: Interaction) {
        if (interaction.isCommand()) return this.client.commands.runCommand(interaction as CommandInteraction);

        if (interaction.isButton() && ['like-suggestion', 'dislike-suggestion'].includes(interaction.customId)) {
            // Disable reacting via Discord buttons; useful when reactions should only be done via website
            if (process.env.DISABLE_REACTING === 'true') {
                if (!interaction.guildId) return;
                const str = await LanguageManager.getString(interaction.guildId, 'suggestionHandler.reacting_disabled');
                await interaction.reply({ content: str, ephemeral: true });
                return;
            }
            this.client.suggestions.handleButtonInteraction(
                interaction,
                interaction.customId === 'like-suggestion' ? 'like' : 'dislike',
            );
        }
    }
}
