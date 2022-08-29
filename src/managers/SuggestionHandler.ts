import chalk from "chalk";
import { ButtonInteraction, Collection, ContextMenuInteraction, Message, MessageActionRow, MessageButton, TextChannel, ThreadChannel } from "discord.js";
import Database from "../database/Database";
import Guild from "../database/models/guild.model";
import Suggestion from "../database/models/suggestion.model";
import { Suggestion as SuggestionClass } from "../classes/Suggestion";
import { ApiSuggestion } from "../types";
import Bot from "./Bot";
import LanguageManager from "./LanguageManager";
import { URL } from "url";

export default class {

    private sentThreadMessages = new Set<`${string}-${string}-${string}`>();

    constructor(private readonly bot: Bot) {}

    public async createSuggestion(suggestion: SuggestionClass, guildInfo: Guild, avatar: string) {

        // Check if there is already an embed for this suggestion, we can skip this entire step if there is
        if (suggestion.dbData) {
            return;
        }

        const guild = await this.bot.guilds.fetch(guildInfo.id);
        if (!guild || !suggestion.apiData) {
            return null;
        }

        const channel = await guild.channels.fetch(guildInfo.suggestionChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            this.bot.logger.warn("Channel", chalk.yellow(guildInfo.suggestionChannel), "is not a text channel");
            return null;
        }

        // Send message in the channel
        const embed = await this.createEmbed(guildInfo.id, suggestion.apiData, suggestion.apiData.link, avatar);
        const components = this.getEmbedComponents();
        const message = await channel.send({ embeds: [ embed ], components: [ components ]}).catch((err) => {
            this.bot.logger.warn("Failed to send message to suggestion channel", chalk.yellow(err));
            return undefined;
        });

        if (!message) {
            return null;
        }

        // Start a thread for the suggestion
        const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.suggestion");
        const thread = await message.startThread({
            name: `${str} #${suggestion.apiData.id}`,
        });
        await thread.setRateLimitPerUser(30);

        // Create suggestion in database
        Suggestion.create({ 
            suggestionId: parseInt(suggestion.apiData.id),
            messageId: message.id,
            status: parseInt(suggestion.apiData.status.id),
            url: suggestion.apiData.link,
            guildId: guildInfo.id,
            channelId: guildInfo.suggestionChannel,
        });
    }

    public async createComment(suggestion: SuggestionClass, guildInfo: Guild, commentInfo: { author: string, description: string, avatar: string, commentId: number }) {  
        if (!suggestion.apiData) {
            return;
        }

        if (this.sentThreadMessages.has(this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, commentInfo.commentId))) {
            this.sentThreadMessages.delete(this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, commentInfo.commentId));
            return;
        }
        
        const dbSuggestion = await Suggestion.findOne({ where: { suggestionId: suggestion.apiData.id, guildId: guildInfo.id }});
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

        const content = await this.replaceMessagePlaceholders(guildInfo.id, commentInfo.description);
 
        const embed = this.bot.embeds.baseNoFooter();
        embed.setDescription(this.stripLength(this.fixContent(content), 2048));
        embed.setAuthor({ name: commentInfo.author, iconURL: this.parseAvatarUrl(commentInfo.avatar) });
        await message.thread.send({ embeds: [ embed ]}).catch(() => undefined);

        if (!suggestion.apiData.status.open && !message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.suggestion_closed_website");
            await message.thread.setLocked(true, str);
            await message.thread.setArchived(true, str);
        } else if (suggestion.apiData.status.open && message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, "suggestionHandler.suggestion_opened_website");
            await message.thread.setLocked(false, str);
            await message.thread.setArchived(false, str);
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
        
        const response = await this.bot.suggestionsApi.sendComment(suggestionInfo.suggestionId, msg.guildId!, content, authorId);
        if (response.error == "nameless:cannot_find_user") {
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
        } else {
            this.sentThreadMessages.add(this.createThreadMessageCompositeId(msg.guildId!, suggestionInfo.suggestionId, response.comment_id));
        }
    }

    public async handleButtonInteraction(interaction: ButtonInteraction, interactionType: "like" | "dislike") {
        await interaction.deferReply({ ephemeral: true });

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
            interaction.editReply({ embeds: [ embed ] });
            return;
        }

        const str = await LanguageManager.getString(interaction.guildId!, "suggestionHandler.reaction_registered", "reaction", interactionType == "like" ? "👍" : "👎");
        const embed = this.bot.embeds.base();
        embed.setDescription(str!);
        interaction.editReply({ embeds: [ embed ] });
    }

    private async createEmbed(guildId: string, suggestion: ApiSuggestion, url: string, avatar: string) {
        const str = await LanguageManager.getString(guildId, "suggestionHandler.suggested_by", "user", suggestion.author.username);
        const description = await this.replaceMessagePlaceholders(guildId, suggestion.content);

        const embed = this.bot.embeds.base();
        embed.setTitle(`#${suggestion.id} - ${this.stripLength(suggestion.title, 100)}`);
        embed.setDescription(this.stripLength(this.fixContent(description), 4092));
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
        content = content.replace(/<br \/>/g, "");
        return content;
    } 

    //
    // UTILITY: Make all suggestions from the api get sent into the suggestion channel. 
    //

    public async sendAllSuggestions(guildId: string, startFrom = 0) {
        const guildData = await Database.getGuildData(guildId);
        const apiSuggestions = await this.bot.suggestionsApi.getSuggestions(guildId);
        if (!apiSuggestions) {
            this.bot.logger.error(`Error getting suggestions from API: ${JSON.stringify(apiSuggestions)}`);
            return;
        }

        const filteredSuggestions = apiSuggestions?.suggestions.sort((a, b)=> parseInt(a.id) - parseInt(b.id)).filter(s => parseInt(s.id) > startFrom);

        // Loop through all suggestions and send them in their respective channel
        for (const shortSuggestion of filteredSuggestions) {
            const suggestion = await SuggestionClass.getSuggestion(shortSuggestion.id, guildId, this.bot);
            if (!suggestion.apiData) {
                continue;
            }
            if (suggestion.apiData.status.open == false) {
                this.bot.logger.debug("Suggestion is closed, skipping");
                continue;
            }
            this.bot.logger.debug("Creating new suggestion from API. Suggestion ID: " + chalk.yellow(suggestion.apiData.id));

            await this.createSuggestion(suggestion, guildData, `https://avatars.dicebear.com/api/initials/${suggestion.apiData.author.username}.png?size=128`);
            if (!suggestion.comments) {
                this.bot.logger.error(`Error getting comments for suggestion ${suggestion.apiData.id} from API: ${JSON.stringify(suggestion.comments)}`);
                continue;
            }

            // Load all comments into the suggestion
            for (const comment of suggestion.comments.comments) {
                this.bot.logger.debug("Creating new comment from API. Comment ID: " + chalk.yellow(comment.id));
                await this.createComment(suggestion, guildData, {
                    avatar: `https://avatars.dicebear.com/api/initials/${comment.user.username}.png?size=128`,
                    description: comment.content,
                    author: comment.user.username,
                    commentId: comment.id
                });
            }
        }
        this.bot.logger.debug("Finished sending all suggestions from API.");
    }

    private createThreadMessageCompositeId(guildId: string, suggestionId: string, commentId: number): `${string}-${string}-${string}` {
        return `${guildId}-${suggestionId}-${commentId}`
    }

    private async replaceMessagePlaceholders(guildId: string, content: string) {
        const regex = /\[user\](\d+)\[\/user\]/gm
        let m;

        console.log(content);

        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const fullMatch = m[0];
            const numMatch = m[1]
            
            const apiCredentials = await Database.getApiCredentials(guildId);
            if (!apiCredentials) {
                return content;
            }

            const siteUser = await this.bot.suggestionsApi.getUserInfo(numMatch, guildId)!;
            if (!siteUser || siteUser.error || !siteUser.exists) {
                continue;
            }

            const url = new URL(apiCredentials.apiurl)
            content = content.split(fullMatch).join(`[@${siteUser.username}](${url.protocol}//${url.hostname}/profile/${encodeURIComponent(siteUser.username!)})`)
        }

        return content;
    }
}