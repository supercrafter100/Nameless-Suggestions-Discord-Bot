import { Command } from '@crystaldevelopment/command-handler/dist';
import { ChatInputCommandInteraction } from 'discord.js';
import Bot from '../managers/Bot';

export default class extends Command {
    public name = 'invite';
    public description = 'Invite the discord bot';
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as Bot;

        // Step 1, introduction & requesting api key
        const embed = client.embeds
            .base()
            .setDescription(
                'To invite the bot. Click [here](https://discord.com/oauth2/authorize?client_id=991303300395847751&permissions=395673939024&scope=bot%20applications.commands) to invite the bot.'
            );
        interaction.reply({
            embeds: [embed],
        });
    }
}
