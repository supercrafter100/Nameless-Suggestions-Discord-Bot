import { ChatInputCommandInteraction } from 'discord.js';
import path from 'path';
import { SubcommandGroup } from '@crystaldevelopment/command-handler/dist';

export default class extends SubcommandGroup {
    public name = 'set';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    public description = (require('../../language/en_UK.json') as { command_descriptions: Record<string, string> }).command_descriptions?.settings_set ?? 'Set a setting';
    public options = [];

    public onStart(): void {
        this.loadSubcommandsFromDir(path.join(__dirname, 'settings'), true);
    }

    public onLoad() {
        null;
    }
    public async run(interaction: ChatInputCommandInteraction) {
        if (!interaction.isCommand()) {
            return;
        }

        await this.runSubcommand(interaction);
    }
}
