import { Command } from '@crystaldevelopment/command-handler/dist';
import { ApplicationCommandOptionData, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import Database from '../database/Database';
import Bot from '../managers/Bot';
import LanguageManager from '../managers/LanguageManager';

export default class extends Command {
    public name = 'webhookurl';
    public description = 'Get the webhook url for your website!';
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction): Promise<unknown> {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply('This command can only be used in a server');
            return;
        }
        if (!(interaction.member instanceof GuildMember)) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        if (!process.env.DOMAIN) {
            interaction.reply('Something has gone terribly wrong. Environmental variables are not set!');
            return;
        }

        if (!interaction.member.permissions.has('ManageGuild')) {
            const str = await LanguageManager.getString(
                interaction.guildId,
                'permission_required',
                'permission',
                'MANAGE_GUILD'
            );
            await interaction.reply(str);
            return;
        }

        const client = interaction.client as Bot;
        const guildData = await Database.getGuildData(interaction.guildId);
        const token = guildData?.authorizationKey;

        if (!token) {
            const str = await LanguageManager.getString(interaction.guildId, 'commands.webhookurl.generate_key_first');
            await interaction.reply({ content: str, ephemeral: true });
            return;
        }

        const url = process.env.DOMAIN + (process.env.DOMAIN.endsWith('/') ? '' : '/') + 'webhook/' + token;

        const str = await LanguageManager.getString(interaction.guildId, 'commands.webhookurl.success', 'url', url);
        const embed = client.embeds.base();
        embed.setDescription(str);
        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }
}
