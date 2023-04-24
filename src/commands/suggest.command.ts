import { Command } from '@crystaldevelopment/command-handler/dist';
import {
    ApplicationCommandOptionData,
    CommandInteraction,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalActionRowComponentBuilder,
} from 'discord.js';
import Database from '../database/Database';
import LanguageManager from '../managers/LanguageManager';

export default class extends Command {
    public name = 'suggest';
    public description = 'Suggest something!';
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<unknown> {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        if (!(await Database.getApiCredentials(interaction.guildId))) {
            const str = await LanguageManager.getString(interaction.guildId, 'invalid-setup');
            interaction.reply(str);
            return;
        }

        const modalTitleStr = await LanguageManager.getString(interaction.guildId, 'commands.suggest.modal-title');
        const modalQuestion1Str = await LanguageManager.getString(
            interaction.guildId,
            'commands.suggest.modal-question-1'
        );
        const modalQuestion2Str = await LanguageManager.getString(
            interaction.guildId,
            'commands.suggest.modal-question-2'
        );

        const modal = new ModalBuilder();
        modal.setCustomId('suggest-modal');
        modal.setTitle(modalTitleStr);

        const titleInput = new TextInputBuilder();
        titleInput.setCustomId('suggest-title');
        titleInput.setLabel(modalQuestion1Str);
        titleInput.setStyle(TextInputStyle.Short);
        titleInput.setRequired(true);
        titleInput.setMinLength(6);

        const descriptionInput = new TextInputBuilder();
        descriptionInput.setCustomId('suggest-description');
        descriptionInput.setLabel(modalQuestion2Str);
        descriptionInput.setStyle(TextInputStyle.Paragraph);
        descriptionInput.setMinLength(10);
        descriptionInput.setRequired(true);

        const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(titleInput);

        const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(descriptionInput);

        modal.addComponents(firstActionRow, secondActionRow);
        await interaction.showModal(modal);
    }
}
