import { Command } from '@crystaldevelopment/command-handler/dist';
import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { join } from 'path';
import LanguageManager from '../managers/LanguageManager';

export default class extends Command {
    public readonly name = 'settings';
    public readonly description = 'Configure settings';
    public options = [];

    public onStart() {
        this.loadSubcommandsFromDir(join(__dirname, 'settings'));
    }
    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply('This command can only be used in a server');
            return;
        }
        if (!(interaction.member instanceof GuildMember)) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        if (!interaction.member.permissions.has('ManageGuild')) {
            const str = await LanguageManager.getString(
                interaction.guildId,
                'permission_required',
                'permission',
                'MANAGE_GUILD'
            );
            await interaction.reply({ content: str });
            return;
        }
        await this.runSubcommand(interaction);
    }
}
