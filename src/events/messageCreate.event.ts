import { Message } from 'discord.js';
import Database from '../database/Database';
import { Event } from '../handlers/EventHandler';

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
            this.client.suggestions.sendCommentToSite(msg);
        }
    }
}
