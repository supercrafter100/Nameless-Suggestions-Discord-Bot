import Suggestion from '../database/models/suggestion.model';
import { Guild as DGuild } from 'discord.js';
import Guild from '../database/models/guild.model';
import { Event } from '../handlers/EventHandler';

export default class InteractionCreate extends Event<'guildDelete'> {
    public event = 'guildDelete';

    public run(guild: DGuild) {
        3;
        this.client.logger.info('Left guild', guild.name);
        Suggestion.destroy({ where: { guildId: guild.id } });
        Guild.destroy({ where: { id: guild.id } });
    }
}
