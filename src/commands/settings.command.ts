import { Command } from "@crystaldevelopment/command-handler/dist";
import {
    ApplicationCommandOptionData,
    CommandInteraction,
    GuildMember,
} from "discord.js";
import { join } from "path";

export default class extends Command {
    public readonly name = "settings";
    public readonly description = "Configure settings";
    public options: ApplicationCommandOptionData[] = [];

    public onStart() {
        this.loadSubcommandsFromDir(join(__dirname, "settings"));
    }
    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction) {
        if (!interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }
        if (!(interaction.member instanceof GuildMember)) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        if (!interaction.member.permissions.has("MANAGE_GUILD")) {
            await interaction.reply(
                'You do not have the required "Manage Guild" permission'
            );
            return;
        }
        await this.runSubcommand(interaction);
    }
}
