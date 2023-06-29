import { Interaction } from 'discord.js';
import { Event } from '../handlers/EventHandler';
import LanguageManager from '../managers/LanguageManager';
import Database from '../database/Database.js';
import ApiError from '../api/ApiError.js';

export default class InteractionCreate extends Event<'interactionCreate'> {
    public event = 'interactionCreate';

    public async run(interaction: Interaction) {
        if (!interaction.guildId) return;

        if (interaction.isModalSubmit() && interaction.customId === 'suggest-modal') {
            const title = interaction.fields.getTextInputValue('suggest-title');
            const description = interaction.fields.getTextInputValue('suggest-description');
            await interaction.deferReply({ ephemeral: true });

            const credentials = await Database.getApiCredentials(interaction.guildId);
            if (!credentials) {
                const str = await LanguageManager.getString(interaction.guildId, 'invalid-setup');
                const embed = this.client.embeds.base();
                embed.setDescription('`❌` ' + str);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const apiHandler = await this.client.suggestionsApi.getApi(interaction.guildId);
            const res = await apiHandler
                .createSuggestion(credentials, title, description, interaction.user.id)
                .catch(async (err) => {
                    if (!(err instanceof ApiError) || !interaction.guildId) {
                        this.client.logger.error('Error sending suggestion: ', err);
                        interaction.editReply('Something broke! Please try again later.');
                        return;
                    }

                    if (err.namespace === 'nameless' && err.code === 'cannot_find_user') {
                        const str = await LanguageManager.getString(
                            interaction.guildId,
                            'commands.suggest.cannot_find_user'
                        );
                        const embed = this.client.embeds.base();
                        embed.setDescription(str);
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }

                    if (err.namespace === 'nameless' && err.code === 'validation_errors') {
                        const str = await LanguageManager.getString(
                            interaction.guildId,
                            'commands.suggest.validation-error',
                            'error',
                            err.meta?.join(', ') || ''
                        );
                        const embed = this.client.embeds.base();
                        embed.setDescription(str);
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                });
            if (!res) return;

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
