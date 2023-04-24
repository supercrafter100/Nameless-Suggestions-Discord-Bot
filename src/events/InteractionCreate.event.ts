import { CommandInteraction, Interaction } from 'discord.js';
import { Event } from '../handlers/EventHandler';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public run(interaction: Interaction) {
        if (interaction.isCommand()) return this.client.commands.runCommand(interaction as CommandInteraction);

        if (interaction.isButton() && ['like-suggestion', 'dislike-suggestion'].includes(interaction.customId)) {
            this.client.suggestions.handleButtonInteraction(
                interaction,
                interaction.customId === 'like-suggestion' ? 'like' : 'dislike'
            );
        }
    }
}
