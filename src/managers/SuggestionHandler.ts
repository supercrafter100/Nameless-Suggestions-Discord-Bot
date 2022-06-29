import chalk from "chalk";
import { ButtonInteraction, Collection, ContextMenuInteraction, Message, MessageActionRow, MessageButton, TextChannel, ThreadChannel } from "discord.js";
import Database from "../database/Database";
import Guild from "../database/models/guild.model";
import Suggestion from "../database/models/suggestion.model";
import { ApiSuggestion } from "../types";
import Bot from "./Bot";
import LanguageManager from "./LanguageManager";

export default class {

    private lastSentThreadMessage = new Collection<string, string>();

    constructor(private readonly bot: Bot) {}

    public async createSuggestion(suggestion: ApiSuggestion, guildInfo: Guild, avatar: string) {
        const guild = await this.bot.guilds.fetch(guildInfo.id);
        if (!guild) {
            return null;
        }

        const channel = await guild.channels.fetch(guildInfo.suggestionChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            return null;
        }

        // Send message in the channel
        const embed = await this.createEmbed(guildInfo.id, suggestion, suggestion.link, avatar);
        const components = this.getEmbedComponents();
        const message = await channel.send({ embeds: [ embed ], components: [ components ]}).catch(() => undefined);
        if (!message) {
            return null;
        }

        // Start a thread for the suggestion
        const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.sugggestion");
        await message.startThread({
            name: `${str} #${suggestion.id}`,
        });

        // Create suggestion in database
        Suggestion.create({ 
            suggestionId: parseInt(suggestion.id),
            messageId: message.id,
            status: parseInt(suggestion.status.id),
            url: suggestion.link,
            guildId: guildInfo.id,
            channelId: guildInfo.suggestionChannel,
        });
    }

    public async createComment(suggestion: ApiSuggestion, guildInfo: Guild, commentInfo: { author: string, description: string, avatar: string }) {  
        if (this.lastSentThreadMessage.has(suggestion.id.toString())) {
            const content = this.lastSentThreadMessage.get(suggestion.id.toString())!;
            this.lastSentThreadMessage.delete(suggestion.id.toString());
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
        embed.setDescription(this.stripLength(this.fixContent(commentInfo.description), 2048));
        embed.setAuthor({ name: commentInfo.author, iconURL: this.parseAvatarUrl(commentInfo.avatar) });
        await message.thread.send({ embeds: [ embed ]}).catch(() => undefined);

        if (!suggestion.status.open && !message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.suggestion_closed_website");
            await message.thread.setLocked(true, str);
        } else if (suggestion.status.open && message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.suggestion_opened_website");
            await message.thread.setLocked(false, str);
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
            
            const str = await LanguageManager.getString(msg.guildId!, "suggestionHandler.cannot_find_user");
            const embed = this.bot.embeds.base();
            embed.setDescription("`❌` " + str);

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
            const str = await LanguageManager.getString(interaction.guildId!, "suggestionHandler.cannot_find_user");
            const embed = this.bot.embeds.base();
            embed.setDescription("`❌` " + str);
            interaction.reply({ embeds: [ embed ], ephemeral: true });
            return;
        }

        const str = await LanguageManager.getString(interaction.guildId!, "suggestionHandler.reaction_registered", "reaction", interactionType == "like" ? "👍" : "👎");
        const embed = this.bot.embeds.base();
        embed.setDescription(str!);
        interaction.reply({ embeds: [ embed ], ephemeral: true });
    }

    private async createEmbed(guildId: string, suggestion: ApiSuggestion, url: string, avatar: string) {
        const str = await LanguageManager.getString(guildId, "suggestionHandler.suggested_by", "user", suggestion.author.username);
        const embed = this.bot.embeds.base();
        embed.setTitle(`#${suggestion.id} - ${this.stripLength(suggestion.title, 100)}`);
        embed.setDescription(this.stripLength(this.fixContent(suggestion.content), 4092));
        embed.setFooter({ text: str!, iconURL: this.parseAvatarUrl(avatar) });	
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

    private fixContent(content: string) {
        content = content.replace(/<br \/>/g, "\n");
        return content;
    } 

    //
    // UTILITY: Make all suggestions from the api get sent into the suggestion channel. 
    //

    public async sendAllSuggestions(guildId: string) {
        const guildData = await Database.getGuildData(guildId);
        const apiSuggestions = await this.bot.suggestionsApi.getSuggestions(guildId);
        if (!apiSuggestions) {
            this.bot.logger.error(`Error getting suggestions from API: ${JSON.stringify(apiSuggestions)}`);
            return;
        }

        const filteredSuggestions = apiSuggestions?.suggestions.sort((a, b)=> parseInt(a.id) - parseInt(b.id))

        // Loop through all suggestions and send them in their respective channel
        for (const shortSuggestion of filteredSuggestions) {
            const suggestion = await this.bot.suggestionsApi.getSuggestion(parseInt(shortSuggestion.id), guildId);
            if (!suggestion) {
                continue;
            }
            this.bot.logger.debug("Creating new suggestion from API. Suggestion ID: " + chalk.yellow(suggestion.id));

            await this.createSuggestion(suggestion, guildData, `https://avatars.dicebear.com/api/initials/${suggestion.author.username}.png?size=128`);
            const comments = await this.bot.suggestionsApi.getSuggestionComments(suggestion.id, guildId);
            if (!comments) {
                this.bot.logger.error(`Error getting comments for suggestion ${suggestion.id} from API: ${JSON.stringify(comments)}`);
                continue;
            }

            // Load all comments into the suggestion
            for (const comment of comments?.comments) {
                this.bot.logger.debug("Creating new comment from API. Comment ID: " + chalk.yellow(comment.id));
                await this.createComment(suggestion, guildData, {
                    avatar: `https://avatars.dicebear.com/api/initials/${comment.user.username}.png?size=128`,
                    description: comment.content,
                    author: comment.user.username
                });
            }
        }
        this.bot.logger.debug("Finished sending all suggestions from API.");
    }
}