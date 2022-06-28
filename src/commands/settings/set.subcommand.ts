import { CommandInteraction } from "discord.js";
import path from "path";
import { SubcommandGroup } from "@crystaldevelopment/command-handler/dist";

export default class extends SubcommandGroup {
    public name = "set";
    public description = "Set a setting";
    public options = [];

    public onStart(): void {
        this.loadSubcommandsFromDir(path.join(__dirname, "settings"), true);
    }

    public onLoad() {
        null;
    }
    public async run(interaction: CommandInteraction) {
        if (!interaction.isCommand()) {
            return;
        }

        await this.runSubcommand(interaction);
    }
}
