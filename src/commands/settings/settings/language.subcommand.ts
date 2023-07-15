import { Subcommand } from '@crystaldevelopment/command-handler/dist';
import { ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import Bot from '../../../managers/Bot';
import Database from '../../../database/Database';
import LanguageManager from '../../../managers/LanguageManager';

export default class extends Subcommand {
    public name = 'language';
    public description = 'Change the language of the discord bot';
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad() {
        null;
    }

    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply('This command can only be used in a server');
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const embed = (this.client as Bot).embeds.base();
        const desc = await LanguageManager.getString(
            interaction.guildId,
            'commands.settings.set.language.select_language'
        );
        embed.setDescription(desc);
        embed.setFooter({
            text: 'https://translate.namelessmc.com/projects/third-party-resources/suggestions-module-discord-bot/',
        });

        const guildData = await Database.getGuildData(interaction.guildId);
        const current_language = guildData.language;
        const available_languages = Object.keys(LanguageManager.languageMap);

        const select_lang_str = await LanguageManager.getString(
            interaction.guildId,
            'commands.settings.set.language.select_language_option'
        );
        const row = new ActionRowBuilder<StringSelectMenuBuilder>();
        row.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select-language')
                .setPlaceholder(current_language)
                .addOptions(
                    available_languages.map((c) => {
                        return { label: c, value: c, description: select_lang_str.replace('{language}', c) };
                    })
                )
        );

        await interaction.editReply({ embeds: [embed], components: [row] });

        const response = await interaction.channel
            ?.awaitMessageComponent({
                filter: (i) => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                },
                componentType: ComponentType.StringSelect,
                time: 60000,
            })
            .catch(() => undefined);

        if (!response) return;

        const language = (LanguageManager.languageMap as Record<string, string>)[response.values[0]];
        guildData.language = language;
        await guildData.save();

        const str = await LanguageManager.getString(
            interaction.guildId,
            'commands.settings.set.language.success',
            'language',
            language
        );
        const embed2 = (this.client as Bot).embeds.base();
        embed2.setDescription(str);
        embed2.setFooter({
            text: 'https://translate.namelessmc.com/projects/third-party-resources/suggestions-module-discord-bot/',
        });

        interaction.editReply({ embeds: [embed2], components: [] });
    }
}
