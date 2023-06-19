import { Command } from '@crystaldevelopment/command-handler/dist';
import { ApplicationCommandOptionData, ChatInputCommandInteraction } from 'discord.js';
import Bot from '../managers/Bot';
import LanguageManager from '../managers/LanguageManager';

export default class extends Command {
    public name = 'donate';
    public description = 'Feeling generous?';
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as Bot;
        if (!interaction.guildId)
            return void interaction.reply({ content: 'This command can only be executed in a guild! ' });
        const term = await LanguageManager.getString(
            interaction.guildId,
            'commands.donate',
            'x',
            'https://ko-fi.com/supercrafter100'
        );

        // Step 1, introduction & requesting api key
        const embed = client.embeds.base().setDescription(term);
        interaction.reply({
            embeds: [embed],
        });
    }
}
