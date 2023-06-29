import {
    Message,
    ButtonInteraction,
    CacheType,
    EmbedBuilder,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ThreadChannel,
} from 'discord.js';
import { ApiComment } from '../../api/types/index.js';
import { Suggestion } from '../../classes/Suggestion.js';
import Guild from '../../database/models/guild.model.js';
import { reactionType } from '../BaseSuggestionAPI.js';
import BaseSuggestionHandler from '../BaseSuggestionHandler.js';
import chalk from 'chalk/index.js';
import LanguageManager from '../LanguageManager.js';
import SuggestionModel from '../../database/models/suggestion.model.js';
import CommentModel from '../../database/models/comment.model.js';
import { NamelessUser } from '../../classes/NamelessUser.js';
import { getWebhookForChannel, splitOversizedMessage } from '../../util/WebhookUtils.js';
import * as ContentUtils from '../../util/ContentUtils.js';
import Database from '../../database/Database.js';
import ApiError from '../../api/ApiError.js';

export default class extends BaseSuggestionHandler {
    minVersion = 210;
    maxVersion = 220;

    async createSuggestion(suggestion: Suggestion, guildInfo: Guild): Promise<void> {
        // Check if there is already an embed for this suggestion, we can skip this entire step if there is
        if (suggestion.dbData) {
            return;
        }

        const guild = await this.bot.guilds.fetch(guildInfo.id);
        if (!guild || !suggestion.apiData) {
            return;
        }

        const channel = await guild.channels.fetch(guildInfo.suggestionChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            this.bot.logger.warn('Channel', chalk.yellow(guildInfo.suggestionChannel), 'is not a text channel');
            return;
        }

        // Get the current avatar url
        const author = await suggestion.getAuthor();
        if (!author) {
            return;
        }
        const authorAvatar =
            author.avatar_url ||
            `https://avatars.dicebear.com/api/initials/${suggestion.apiData.author.username}.png?size=128`;

        // Send message in the channel

        const embed = await this.createEmbed(suggestion.apiData, guildInfo.id);
        const components = this.getEmbedComponents({
            likes: parseInt(suggestion.apiData.likes_count),
            dislikes: parseInt(suggestion.apiData.dislikes_count),
        });
        const message = await channel.send({ embeds: [embed], components: [components] }).catch((err) => {
            this.bot.logger.warn('Failed to send message to suggestion channel', chalk.yellow(err));
            return undefined;
        });

        if (!message) {
            return;
        }

        // Start a thread for the suggestion
        const str = await LanguageManager.getString(guildInfo.id, 'suggestionHandler.suggestion');
        const thread = await message.startThread({
            name: `${str} #${suggestion.apiData.id}`,
        });
        await thread.setRateLimitPerUser(30);

        // Create suggestion in database
        await SuggestionModel.create({
            suggestionId: parseInt(suggestion.apiData.id),
            messageId: message.id,
            status: parseInt(suggestion.apiData.status.id),
            url: suggestion.apiData.link,
            guildId: guildInfo.id,
            channelId: guildInfo.suggestionChannel,
        });
    }
    async createComment(suggestion: Suggestion, guildInfo: Guild, comment: ApiComment): Promise<void> {
        if (!suggestion.apiData) {
            return;
        }

        if (!suggestion.dbData) {
            await this.recoverSuggestion(suggestion, guildInfo);
            await suggestion.refresh();

            if (!suggestion.dbData) {
                return; // Creation of the suggestion failed...
            }
        }

        if (
            this.sentThreadMessages.has(
                this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, comment.id)
            )
        ) {
            this.sentThreadMessages.delete(
                this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, comment.id)
            );
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
        const message = await channel.messages.fetch(suggestion.dbData.messageId);
        if (!message) {
            return;
        }

        if (!message.thread) {
            return;
        }

        const content = await this.replaceMessagePlaceholders(guildInfo.id, comment.content);
        const author = await NamelessUser.getUserById(comment.user.id, guildInfo.id, this.bot);
        if (!author) {
            return;
        }

        const authorAvatar = author.avatar_url || `https://cravatar.eu/helmavatar/${author.username}`;

        // Get webhook to send message as
        const webhook = await getWebhookForChannel(channel);

        const parts = splitOversizedMessage(ContentUtils.fixContent(content), 2000);
        if (!parts.length) return;

        let threadMessage: Message | undefined;
        for (const part of parts) {
            if (webhook) {
                threadMessage = await webhook.send({
                    content: part,
                    username: comment.user.username,
                    avatarURL: authorAvatar,
                    threadId: message.thread.id,
                });
            } else {
                const embed = this.bot.embeds.baseNoFooter();
                embed.setDescription(part);
                embed.setAuthor({ name: comment.user.username, iconURL: authorAvatar });
                threadMessage = await message.thread.send({ embeds: [embed] });
            }
        }

        if (!threadMessage) {
            this.bot.logger.error('There was no thread message! Did something go wrong???');
            return;
        }

        await CommentModel.create({
            suggestionId: suggestion.apiData.id,
            commentId: comment.id,

            guildId: suggestion.dbData.guildId,
            channelId: suggestion.dbData.channelId,
            messageId: threadMessage.id,
        });

        if (!suggestion.apiData.status.open && !message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, 'suggestionHandler.suggestion_closed_website');
            await message.thread.setLocked(true, str);
            await message.thread.setArchived(true, str);
        } else if (suggestion.apiData.status.open && message.thread.locked) {
            const str = await LanguageManager.getString(guildInfo.id, 'suggestionHandler.suggestion_opened_website');
            await message.thread.setLocked(false, str);
            await message.thread.setArchived(false, str);
        }
    }
    async sendComment(msg: Message<true>): Promise<void> {
        const channel = msg.channel as ThreadChannel;
        const starterMessage = await channel.fetchStarterMessage();
        if (!starterMessage) {
            this.bot.logger.error('Starter message was null!');
            return;
        }

        const suggestionInfo = await SuggestionModel.findOne({
            where: { messageId: starterMessage.id, guildId: msg.guildId },
        });
        if (!suggestionInfo) {
            return;
        }

        const content = await this.replaceDiscordMentions(msg.guildId, msg.content);
        const authorId = msg.author.id;

        const credentials = await Database.getApiCredentials(msg.guildId);
        if (!credentials) {
            await msg.delete();
            const str = await LanguageManager.getString(msg.guildId, 'invalid-setup');
            const embed = this.bot.embeds.base();
            embed.setDescription('`❌` ' + str);

            try {
                msg.author.send({ embeds: [embed] });
            } catch (e) {
                const sent = await msg.channel.send({ embeds: [embed] });
                setTimeout(() => {
                    sent.delete();
                }, 5000);
            }
            return;
        }

        const response = await this.api
            .createComment(credentials, suggestionInfo.suggestionId, content, authorId)
            .catch(async (error) => {
                if (!(error instanceof ApiError)) {
                    return;
                }

                if (error.namespace === 'nameless' && error.code === 'cannot_find_user') {
                    await msg.delete();

                    const str = await LanguageManager.getString(msg.guildId, 'suggestionHandler.cannot_find_user');
                    const embed = this.bot.embeds.base();
                    embed.setDescription('`❌` ' + str);

                    try {
                        msg.author.send({ embeds: [embed] });
                    } catch (e) {
                        const sent = await msg.channel.send({ embeds: [embed] });
                        setTimeout(() => {
                            sent.delete();
                        }, 5000);
                    }
                }
            });

        if (response) {
            this.sentThreadMessages.add(
                this.createThreadMessageCompositeId(msg.guildId, suggestionInfo.suggestionId, response.comment_id)
            );
        }
    }
    async handleReactionInteraction(
        interaction: ButtonInteraction<CacheType>,
        interactionType: reactionType
    ): Promise<void> {
        throw new Error('Method not implemented.');
    }
    async updateSuggestionEmbed(suggestion: Suggestion, guildInfo: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    async removedDeletedComment(suggestion: Suggestion, commentId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    async removeDeletedSuggestion(suggestion: Suggestion): Promise<void> {
        throw new Error('Method not implemented.');
    }
    async createEmbed(suggestion: Suggestion, guildId: string): Promise<EmbedBuilder> {
        throw new Error('Method not implemented.');
    }

    private getEmbedComponents({ likes, dislikes }: { likes: number; dislikes: number }) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(
            new ButtonBuilder().setCustomId('like-suggestion').setLabel(`${likes} 👍`).setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('dislike-suggestion')
                .setLabel(`${dislikes} 👎`)
                .setStyle(ButtonStyle.Danger)
        );
        return row;
    }
}
