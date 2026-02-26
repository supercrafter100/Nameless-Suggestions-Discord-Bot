import { EmbedBuilder } from 'discord.js';
import Bot from '../managers/Bot';
import LanguageManager from '../managers/LanguageManager';

export default class Embeds {
    constructor(private readonly client: Bot) {}

    public base() {
        const watermark = LanguageManager.getWatermark();
        const builder = new EmbedBuilder().setColor('#2F3136');
        if (watermark) {
            builder.setFooter({
                text: watermark,
                iconURL: this.client.user?.displayAvatarURL(),
            });
        }
        return builder;
    }

    public baseNoFooter() {
        return new EmbedBuilder().setColor('#2F3136');
    }
}
