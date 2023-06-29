import { CommandInteraction, Interaction } from 'discord.js';
import { Event } from '../handlers/EventHandler';
import { reactionType } from '../managers/BaseSuggestionAPI.js';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public async run(interaction: Interaction) {
        if (interaction.isCommand()) return this.client.commands.runCommand(interaction as CommandInteraction);

        if (interaction.isButton() && ['like-suggestion', 'dislike-suggestion'].includes(interaction.customId)) {
            const suggestionHandler = await this.client.suggestions.getHandler(interaction.guildId!);
            suggestionHandler.handleReactionInteraction(
                interaction,
                reactionType[interaction.customId === 'like-suggestion' ? 'LIKE' : 'DISLIKE']
            );
        }
    }
}
