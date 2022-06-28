import { CommandInteraction, Message } from "discord.js";
import Database from "../database/Database";
import Suggestion from "../database/models/suggestion.model";
import { Event } from "../handlers/EventHandler";

export default class InteractionCreate extends Event<"messageDelete"> {
    public event = "messageDelete";

    public async run(msg: Message) {
        if (!msg.guild || !msg.guild.id) return;
        const suggestion = await Suggestion.findOne({ where: { messageId: msg.id, guildId: msg.guildId }});
        if (suggestion) {
            await suggestion.destroy();
        }
    }
}
