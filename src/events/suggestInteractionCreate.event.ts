import { Interaction } from 'discord.js';
import { Event } from '../handlers/EventHandler';
import LanguageManager from '../managers/LanguageManager';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public async run(interaction: Interaction) {
        if (!interaction.guildId) return;

        if (interaction.isModalSubmit() && interaction.customId === 'suggest-modal') {
            const title = interaction.fields.getTextInputValue('suggest-title');
            const description = interaction.fields.getTextInputValue('suggest-description');
            await interaction.deferReply({ ephemeral: true });

            const res = await this.client.suggestionsApi.sendSuggestion(
                interaction.guildId,
                title,
                description,
                interaction.user.id
            );
            if (res.error === 'nameless:cannot_find_user') {
                const str = await LanguageManager.getString(interaction.guildId, 'commands.suggest.cannot_find_user');
                const embed = this.client.embeds.base();
                embed.setDescription(str);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // There should always be a response, but in case it still fails...
            if (!res) {
                interaction.editReply('Something broke! Please try again later.');
                return;
            }

            if (res.error === 'suggestions:validation_errors') {
                const str = await LanguageManager.getString(
                    interaction.guildId,
                    'commands.suggest.validation-error',
                    'error',
                    res.meta.join(', ')
                );
                const embed = this.client.embeds.base();
                embed.setDescription(str);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (res.error) {
                this.client.logger.error('Error sending suggestion: ', res);
                interaction.editReply('Something broke! ' + res.error);
                return;
            }

            const str = await LanguageManager.getString(
                interaction.guildId,
                'commands.suggest.success',
                'link',
                res.link
            );
            const embed = this.client.embeds.base();
            embed.setDescription(str);

            interaction.editReply({ embeds: [embed] });
        }
    }
}
