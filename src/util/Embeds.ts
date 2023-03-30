import { EmbedBuilder } from "discord.js";
import Bot from "../managers/Bot";

export default class Embeds {
    constructor(private readonly client: Bot) { }

    public base() {
        return new EmbedBuilder().setColor("#2F3136").setFooter({
            text: `Nameless Suggestions`,
            iconURL: this.client.user.displayAvatarURL(),
        });
    }

    public baseNoFooter() {
        return new EmbedBuilder().setColor("#2F3136");
    }
}
