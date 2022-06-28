import { ButtonInteraction, Collection, ContextMenuInteraction, Message, MessageActionRow, MessageButton, TextChannel, ThreadChannel } from "discord.js";
import Guild from "../database/models/guild.model";
import Suggestion from "../database/models/suggestion.model";
import { ApiSuggestion } from "../types";
import Bot from "./Bot";

export default class {

    private lastSentThreadMessage = new Collection<string, string>();

    constructor(private readonly bot: Bot) {}

    public async createSuggestion(suggestion: ApiSuggestion, guildInfo: Guild, url: string, avatar: string) {
        const guild = await this.bot.guilds.fetch(guildInfo.id);
        if (!guild) {
            return null;
        }

        const channel = await guild.channels.fetch(guildInfo.suggestionChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            return null;
        }

        // Send message in the channel
        const embed = this.createEmbed(suggestion, url, avatar);
        const components = this.getEmbedComponents();
        const message = await channel.send({ embeds: [ embed ], components: [ components ]});

        // Start a thread for the suggestion
        await message.startThread({
            name: `Suggestion #${suggestion.id}`,
        });

        // Create suggestion in database
        Suggestion.create({ 
            suggestionId: parseInt(suggestion.id),
            messageId: message.id,
            status: parseInt(suggestion.status.id),
            url: url,
            guildId: guildInfo.id,
            channelId: guildInfo.suggestionChannel,
        });
    }

    public async createComment(suggestion: ApiSuggestion, guildInfo: Guild, commentInfo: { author: string, description: string, avatar: string }) {  
        if (this.lastSentThreadMessage.has(suggestion.id)) {
            const content = this.lastSentThreadMessage.get(suggestion.id)!;
            this.lastSentThreadMessage.delete(suggestion.id);
            if (commentInfo.description.startsWith(content)) {
                return;
            }
        }
        
        const dbSuggestion = await Suggestion.findOne({ where: { suggestionId: suggestion.id, guildId: guildInfo.id }});
        if (!dbSuggestion) {
            return;
        }

        const guild = await this.bot.guilds.fetch(guildInfo.id);
        if (!guild) {
            return;
        }

        const channel = await guild.channels.fetch(guildInfo.suggestionChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            return;
        }

        // Get the message where the thread is attached to
        const message = await channel.messages.fetch(dbSuggestion.messageId);
        if (!message) {
            return;
        }

        if (!message.thread) {
            return;
        }
 
        const embed = this.bot.embeds.baseNoFooter();
        embed.setDescription(commentInfo.description);
        embed.setAuthor({ name: commentInfo.author, iconURL: this.parseAvatarUrl(commentInfo.avatar) });
        await message.thread.send({ embeds: [ embed ]});

        if (!suggestion.status.open && !message.thread.locked) {
            await message.thread.setLocked(true, "Suggestion closed on website");
        } else if (suggestion.status.open && message.thread.locked) {
            await message.thread.setLocked(false, "Suggestion opened on website");
        }
    }

    public async sendCommentToSite(msg: Message) {
        const channel = msg.channel as ThreadChannel;
        const starterMessage = await channel.fetchStarterMessage();

        const suggestionInfo = await Suggestion.findOne({ where: { messageId: starterMessage.id, guildId: msg.guildId }});
        if (!suggestionInfo) {
            return;
        }
        
        const content = msg.content;
        const authorId = msg.author.id;
        
        this.lastSentThreadMessage.set(suggestionInfo.suggestionId.toString(), content); // Save before sending to the site
        
        const response = await this.bot.suggestionsApi.sendComment(suggestionInfo.suggestionId, msg.guildId!, content, authorId);
        if (response.error == "nameless:cannot_find_user") {
            this.lastSentThreadMessage.delete(suggestionInfo.suggestionId.toString());
            await msg.delete();
            const embed = this.bot.embeds.base();
            embed.setDescription("`❌` You must have your website account linked to be able to reply via discord!");

            try {
                msg.author.send({ embeds: [ embed ]});
            } catch (e) {
                const sent = await msg.channel.send({ embeds: [embed]});
                setTimeout(() => {
                    sent.delete();
                }, 5000);
            }            
        }
    }

    public async handleButtonInteraction(interaction: ButtonInteraction, interactionType: "like" | "dislike") {
        const suggestionInfo = await Suggestion.findOne({ where: { messageId: interaction.message.id, guildId: interaction.guildId }});
        if (!suggestionInfo) {
            return;
        }

        // Attempt to send a like or dislike to the API
        const response = await this.bot.suggestionsApi.sendReaction(suggestionInfo.suggestionId, interaction.guildId!, interactionType, interaction.user.id);
        if (response.error == "nameless:cannot_find_user") {
            const embed = this.bot.embeds.base();
            embed.setDescription("`❌` You must have your website account linked to be able to like or dislike suggestions via discord.");
            interaction.reply({ embeds: [ embed ], ephemeral: true });
            return;
        }

        const embed = this.bot.embeds.base();
        embed.setDescription("`✅` Your reaction has been registered.");
        interaction.reply({ embeds: [ embed ], ephemeral: true });
    }

    private createEmbed(suggestion: ApiSuggestion, url: string, avatar: string) {
        const embed = this.bot.embeds.base();
        embed.setTitle(`#${suggestion.id} - ${this.stripLength(suggestion.title, 100)}`);
        embed.setDescription(this.stripLength(suggestion.content, 4092));
        embed.setFooter({ text: `Suggested by ${suggestion.author.username}`, iconURL: this.parseAvatarUrl(avatar) });	
        embed.setURL(url);
        return embed;
    }

    private getEmbedComponents() {
        const row = new MessageActionRow();
        row.addComponents(
            new MessageButton()
                .setCustomId("like-suggestion")
                .setEmoji("👍")
                .setStyle("SUCCESS"),
            new MessageButton()
                .setCustomId("dislike-suggestion")
                .setEmoji("👎")
                .setStyle("DANGER"),
        )
        return row;
    }

    private stripLength(str: string, length: number) {
        if (str.length > length) {
            return str.substring(0, length) + "...";
        }
        return str;
    }

    private parseAvatarUrl(url: string) {
        url = url.replace(".svg", ".png");
        return url;
    }
}