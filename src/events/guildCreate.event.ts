import { CommandInteraction, Guild } from "discord.js";
import { Event } from "../handlers/EventHandler";

export default class InteractionCreate extends Event<"guildCreate"> {
    public event = "guildCreate";

    public run(guild: Guild) {
        this.client.logger.info("Joined new guild", guild.name);
    }
}
