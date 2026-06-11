import chalk from 'chalk';
import { Event } from '../handlers/EventHandler';
import Database from '../database/Database';
import { loadCommandDescriptions } from '../util/CommandDescriptions';

export default class ReadyEvent extends Event<'ready'> {
    public event = 'ready';
    public async run() {
        // If a specific guild is configured, load its language for command descriptions
        const guildId = process.env.GUILDID;
        if (guildId) {
            try {
                const guildData = await Database.getGuildData(guildId);
                if (guildData?.language) {
                    loadCommandDescriptions(guildData.language);
                    this.logger.info(`Loaded command descriptions for language: ${guildData.language}`);
                }
            } catch {
                // DB not ready yet or guild not found, use default language
            }
        }

        await this.client.commands.loadCommands();

        this.logger.info('Bot is now ready!');
        this.logger.info(`Bot logged in as ${chalk.green.bold(this.client.user.tag)}`);
    }
}
