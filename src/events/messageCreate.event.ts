import { Message } from 'discord.js';
import Database from '../database/Database';
import { Event } from '../handlers/EventHandler';
import LanguageManager from '../managers/LanguageManager';

export default class InteractionCreate extends Event<'messageCreate'> {
    public event = 'messageCreate';

    public async run(msg: Message<true>) {
        if (!msg.guild || !msg.guild.id) return;
        const guildData = await Database.getGuildData(msg.guild.id);

        if (guildData.suggestionChannel === msg.channel.id && msg.system) {
            await msg.delete();
            return;
        }

        if (
            msg.channel.isThread() &&
            msg.channel.parentId === guildData.suggestionChannel &&
            !msg.author.bot &&
            !msg.author.system
        ) {
            // Disable commenting via Discord; useful when comments should only come from website
            if (process.env.DISABLE_COMMENTING === 'true') {
                const str = await LanguageManager.getString(msg.guild.id, 'suggestionHandler.commenting_disabled');
                await msg.delete();
                await msg.author.send(str).catch(() => null);
                return;
            }
            this.client.suggestions.sendCommentToSite(msg);
        }
    }
}
