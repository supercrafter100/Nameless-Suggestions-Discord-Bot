import { CommandInteraction, Interaction } from "discord.js";
import { Event } from "../handlers/EventHandler";
import LanguageManager from "../managers/LanguageManager";

export default class InteractionCreate extends Event<"interactionCreate"> {
    public event: "interactionCreate" = "interactionCreate";

    public async run(interaction: Interaction) {
        if (interaction.isModalSubmit() && interaction.customId === "suggest-modal") {
            const title = interaction.fields.getTextInputValue("suggest-title");
            const description = interaction.fields.getTextInputValue("suggest-description");

            let res = await this.client.suggestionsApi.sendSuggestion(interaction.guildId!, title, description, interaction.user.id);
            if (res.error === "nameless:cannot_find_user") {
                const str = await LanguageManager.getString(interaction.guildId!, "commands.suggest.cannot_find_user");
                const embed = this.client.embeds.base();
                embed.setDescription(str!);
                await interaction.reply({ embeds: [ embed ]});
                return;
            }

            if (res.error) {
                this.client.logger.error("Error sending suggestion: ", res);
                interaction.reply("Something broke! " + res.error);
                return;
            }

            const str = await LanguageManager.getString(interaction.guildId!, "commands.suggest.success", "link", res.link);
            const embed = this.client.embeds.base();
            embed.setDescription(str!);

            interaction.reply({ ephemeral: true, embeds: [ embed ] });
        }
    }
}
