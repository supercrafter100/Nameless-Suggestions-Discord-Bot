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
    ColorResolvable,
} from 'discord.js';
import { ApiComment, ApiSuggestion } from '../../api/types/index.js';
import { Suggestion } from '../../classes/Suggestion.js';
import Guild from '../../database/models/guild.model.js';
import { reactionType } from '../BaseSuggestionAPI.js';
import BaseSuggestionHandler from '../BaseSuggestionHandler.js';
import chalk from 'chalk';
import LanguageManager from '../LanguageManager.js';
import SuggestionModel from '../../database/models/suggestion.model.js';
import CommentModel from '../../database/models/comment.model.js';
import { NamelessUser } from '../../classes/NamelessUser.js';
import { getWebhookForChannel, splitOversizedMessage } from '../../util/WebhookUtils.js';
import * as ContentUtils from '../../util/ContentUtils.js';
import Database from '../../database/Database.js';
import ApiError from '../../api/ApiError.js';
import { respondDmFallback } from '../../util/ResponseUtils.js';

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

        const embed = await this.createEmbed(suggestion.apiData, guildInfo.id, authorAvatar);
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
            await respondDmFallback(msg, embed);
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
                    await respondDmFallback(msg, embed);
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
        await interaction.deferReply({ ephemeral: true });

        const suggestionInfo = await SuggestionModel.findOne({
            where: { messageId: interaction.message.id, guildId: interaction.guildId },
        });
        if (!suggestionInfo || !interaction.guildId || !interaction.channel) {
            return;
        }

        const suggestion = await Suggestion.getSuggestion(suggestionInfo.suggestionId, interaction.guildId, this.bot);
        const user = await NamelessUser.getUserByDiscordId(interaction.user.id, interaction.guildId, this.bot);
        if (!user) {
            return;
        }

        const mustBeRemoved =
            !(interactionType === 'like'
                ? suggestion.apiData?.likes.includes(user.id)
                : suggestion.apiData?.dislikes.includes(user.id)) || false;

        if (!interaction.guildId) return;

        const credentials = await Database.getApiCredentials(interaction.guildId);
        if (!credentials) {
            const str = await LanguageManager.getString(interaction.guildId, 'invalid-setup');
            const embed = this.bot.embeds.base();
            embed.setDescription('`❌` ' + str);
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Attempt to send a like or dislike to the API
        const response = await this.api
            .createReaction(
                credentials,
                suggestionInfo.suggestionId,
                interactionType,
                interaction.user.id,
                mustBeRemoved
            )
            .catch(async (error) => {
                if (!(error instanceof ApiError) || !interaction.guildId) {
                    return;
                }

                if (error.namespace === 'nameless' && error.code === 'cannot_find_user') {
                    const str = await LanguageManager.getString(
                        interaction.guildId,
                        'suggestionHandler.cannot_find_user'
                    );
                    const embed = this.bot.embeds.base();
                    embed.setDescription('`❌` ' + str);
                    interaction.editReply({ embeds: [embed] });
                    return;
                }
            });

        if (!response) return;

        const str = await LanguageManager.getString(
            interaction.guildId,
            'suggestionHandler.reaction_registered',
            'reaction',
            interactionType == 'like' ? '👍' : '👎'
        );
        const embed = this.bot.embeds.base();
        embed.setDescription(str);
        interaction.editReply({ embeds: [embed] });
    }

    async updateSuggestionEmbed(suggestion: Suggestion, guildInfo: Guild): Promise<void> {
        if (!suggestion.apiData) return;

        if (!suggestion.dbData) {
            await this.recoverSuggestion(suggestion, guildInfo); // TODO: once the api actually returns the user their avatar, provide it here...
            await suggestion.refresh();
        }

        if (!suggestion.dbData) return;

        const channel = await this.bot.channels.fetch(suggestion.dbData.channelId);
        if (!channel || !(channel instanceof TextChannel)) {
            return;
        }

        const message = await channel.messages.fetch(suggestion.dbData.messageId);
        if (!message) {
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

        const embed = await this.createEmbed(suggestion.apiData, guildInfo.id, authorAvatar);
        const components = this.getEmbedComponents({
            likes: parseInt(suggestion.apiData.likes_count),
            dislikes: parseInt(suggestion.apiData.dislikes_count),
        });
        await message.edit({ embeds: [embed], components: [components] });
    }

    async removeDeletedComment(suggestion: Suggestion, commentId: string): Promise<void> {
        if (!suggestion.dbData || !suggestion.apiData) return;

        // Get the comment from our database
        const dbComment = await CommentModel.findOne({
            where: { guildId: suggestion.dbData.guildId, channelId: suggestion.dbData.channelId, commentId: commentId },
        });

        if (!dbComment) return;

        // Fetch the comment
        const channel = await this.bot.channels.fetch(suggestion.dbData.channelId);
        if (!channel || !(channel instanceof TextChannel)) {
            return;
        }

        const message = await channel.messages.fetch(suggestion.dbData.messageId);
        if (!message || !message.thread) {
            return;
        }

        const commentMessage = await message.thread.messages.fetch(dbComment.messageId).catch(() => undefined);
        if (!commentMessage) return;

        // Weird discord thing. If a thread is archiued or locked, messages
        // cannot be deleted. So we should unlock it, delete the comment
        // then lock and archive it again. Weird workaround but it works.
        let wasLocked = false;
        if (message.thread.locked || message.thread.archived) {
            await message.thread.setLocked(false, 'Temp-unlock for pending comment deletion...');
            await message.thread.setArchived(false, 'Temp-unarchive for pending comment deletion...');
            wasLocked = true;
        }

        await commentMessage.delete().catch(() => undefined);
        await dbComment.destroy();

        if (wasLocked) {
            await message.thread.setLocked(true, 'Lock after pending comment deletion...');
            await message.thread.setArchived(true, 'Archive after pending comment deletion...');
        }
    }

    async removeDeletedSuggestion(suggestion: Suggestion): Promise<void> {
        if (!suggestion.dbData) return;

        // Fetch the comment
        const channel = await this.bot.channels.fetch(suggestion.dbData.channelId);
        if (!channel || !(channel instanceof TextChannel)) {
            return;
        }

        const message = await channel.messages.fetch(suggestion.dbData.messageId);
        if (!message || !message.thread) {
            return;
        }

        await message.thread.delete('Suggestion was deleted').catch(() => undefined);
        await message.delete().catch(() => undefined);
        await suggestion.dbData.destroy();
    }

    async createEmbed(suggestion: ApiSuggestion, guildId: string, avatarUrl: string): Promise<EmbedBuilder> {
        const str = await LanguageManager.getString(
            guildId,
            'suggestionHandler.suggested_by',
            'user',
            suggestion.author.username
        );
        const description = await this.replaceMessagePlaceholders(guildId, suggestion.content);

        const embed = this.bot.embeds.base();
        if (suggestion.status.color) embed.setColor(suggestion.status.color as ColorResolvable);
        embed.setTitle(
            `#${suggestion.id} - ${ContentUtils.stripLength(ContentUtils.fixContent(suggestion.title), 100)}`
        );
        embed.setDescription(ContentUtils.stripLength(ContentUtils.fixContent(description), 4092));
        if (avatarUrl) embed.setFooter({ text: str, iconURL: ContentUtils.parseAvatarUrl(avatarUrl) });
        else embed.setFooter({ text: str });
        embed.setURL(suggestion.link);
        return embed;
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
