import { ChatInputCommandInteraction } from 'discord.js';
import path from 'path';
import { SubcommandGroup } from '@crystaldevelopment/command-handler/dist';
import { getCommandDescription } from '../../util/CommandDescriptions';

export default class extends SubcommandGroup {
    public name = 'set';
    public get description() {
        return getCommandDescription('settings_set', 'Set a setting');
    }
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
