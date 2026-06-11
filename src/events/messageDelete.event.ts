import { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import Suggestion from '../database/models/suggestion.model';
import { Event } from '../handlers/EventHandler';
import Comment from '../database/models/comment.model';

export default class InteractionCreate extends Event<'messageDelete'> {
    public event = 'messageDelete';

    public async run(msg: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>) {
        if (!msg.guild || !msg.guild.id) return;
        const suggestion = await Suggestion.findOne({ where: { messageId: msg.id, guildId: msg.guildId } });
        if (suggestion) {
            await suggestion.destroy();
            await Comment.destroy({ where: { suggestionId: suggestion.suggestionId } });
        }
    }
}
