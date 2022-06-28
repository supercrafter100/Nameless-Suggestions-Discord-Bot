import { Channel } from "discord.js";
import Suggestion from "../database/models/suggestion.model";
import { Event } from "../handlers/EventHandler";

export default class InteractionCreate extends Event<"channelDelete"> {
    public event = "channelDelete";

    public run(channel: Channel) {
        Suggestion.destroy({ where: { channelId: channel.id}})
    }
}
