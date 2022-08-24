import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { ApplicationCommandOptionData, CommandInteraction, MessageActionRow, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import fetch from "node-fetch";
import LanguageManager from "../managers/LanguageManager";

export default class extends Command {
    public name = "suggest";
    public description = "Suggest something!";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const modalTitleStr = await LanguageManager.getString(interaction.guildId, "commands.suggest.modal-title");
        const modalQuestion1Str = await LanguageManager.getString(interaction.guildId, "commands.suggest.modal-question-1");
        const modalQuestion2Str = await LanguageManager.getString(interaction.guildId, "commands.suggest.modal-question-2");

        const modal = new Modal();
        modal.setCustomId("suggest-modal");
        modal.setTitle(modalTitleStr!);

        const titleInput = new TextInputComponent();
        titleInput.setCustomId("suggest-title");
        titleInput.setLabel(modalQuestion1Str!);
        titleInput.setStyle("SHORT");
        titleInput.setRequired(true);
        titleInput.setMinLength(6)

        const descriptionInput = new TextInputComponent();
        descriptionInput.setCustomId("suggest-description");
        descriptionInput.setLabel(modalQuestion2Str!);
        descriptionInput.setStyle("PARAGRAPH");
        descriptionInput.setMinLength(10);
        descriptionInput.setRequired(true);
               
        const firstActionRow = 
            new MessageActionRow<ModalActionRowComponent>().addComponents(
                titleInput
            );
        
        const secondActionRow = 
            new MessageActionRow<ModalActionRowComponent>().addComponents(
                descriptionInput
            );
        
        modal.addComponents(firstActionRow, secondActionRow);
        await interaction.showModal(modal);
    }
}
