import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { CommandInteraction, MessageActionRow, MessageSelectMenu } from "discord.js";
import Bot from "../../../managers/Bot";
import { nanoid } from "nanoid";
import Database from "../../../database/Database";
import LanguageManager from "../../../managers/LanguageManager";
import Embeds from "../../../util/Embeds";

export default class extends Subcommand {
    public name = "language";
    public description = "Change the language of the discord bot";
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad() {
        null;
    }

    public async run(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const embed = (this.client as Bot).embeds.base()
        const desc = await LanguageManager.getString(interaction.guildId, "commands.settings.set.language.select_language");
        embed.setDescription(desc!);

        const guildData = await Database.getGuildData(interaction.guildId);
        const current_language = guildData.language;
        const available_languages = Object.keys(LanguageManager.languageMap);

        const select_lang_str = await LanguageManager.getString(interaction.guildId, "commands.settings.set.language.select_language_option");
        const row = new MessageActionRow();
        row.addComponents(
            new MessageSelectMenu()
                .setCustomId("select-language")
                .setPlaceholder(current_language)
                .addOptions(available_languages.map(c => { return { label: c, value: c, description: select_lang_str!.replace("{language}", c)}}))
        );

        await interaction.editReply({ embeds: [embed], components: [row] });

        const filter = (i: any) => {
            i.deferUpdate();
            return i.user.id === interaction.user.id
        };

        const response = await interaction.channel?.awaitMessageComponent({
            filter,
            componentType: "SELECT_MENU",
            time: 60000
        });

        if (!response) return;

        const language = (LanguageManager.languageMap as any)[response.values[0]];
        guildData.language = language;
        await guildData.save();

        const str = await LanguageManager.getString(interaction.guildId, "commands.settings.set.language.success", "language", language);
        const embed2 = (this.client as Bot).embeds.base();
        embed2.setDescription(str!);
        interaction.editReply({ embeds: [embed2], components: [] });
    }
}
