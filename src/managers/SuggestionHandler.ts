import chalk from 'chalk';
import {
    ButtonInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    TextChannel,
    ThreadChannel,
    ButtonStyle,
    ColorResolvable,
} from 'discord.js';
import Database from '../database/Database';
import Guild from '../database/models/guild.model';
import Suggestion from '../database/models/suggestion.model';
import { Suggestion as SuggestionClass } from '../classes/Suggestion';
import { ApiComment, ApiSuggestion } from '../types';
import Bot from './Bot';
import LanguageManager from './LanguageManager';
import { URL } from 'url';
import { NamelessUser } from '../classes/NamelessUser';
import { getWebhookForChannel, splitOversizedMessage } from '../util/WebhookUtils';
import Comment from '../database/models/comment.model';

export default class {
    private sentThreadMessages = new Set<`${string}-${string}-${string}`>();

    constructor(private readonly bot: Bot) {}

    public async createSuggestion(suggestion: SuggestionClass, guildInfo: Guild) {
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
            this.bot.logger.warn('Channel', chalk.yellow(guildInfo.suggestionChannel), 'is not a text channel');
            return null;
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

        const embed = await this.createEmbed(guildInfo.id, suggestion.apiData, suggestion.apiData.link, authorAvatar);
        const components = this.getEmbedComponents({
            likes: parseInt(suggestion.apiData.likes_count),
            dislikes: parseInt(suggestion.apiData.dislikes_count),
        });
        const message = await channel.send({ embeds: [embed], components: [components] }).catch((err) => {
            this.bot.logger.warn('Failed to send message to suggestion channel', chalk.yellow(err));
            return undefined;
        });

        if (!message) {
            return null;
        }

        // Start a thread for the suggestion
        const str = await LanguageManager.getString(guildInfo.id, 'suggestionHandler.suggestion');
        const thread = await message.startThread({
            name: `${str} #${suggestion.apiData.id}`,
        });
        await thread.setRateLimitPerUser(30);

        // Create suggestion in database
        await Suggestion.create({
            suggestionId: parseInt(suggestion.apiData.id),
            messageId: message.id,
            status: parseInt(suggestion.apiData.status.id),
            url: suggestion.apiData.link,
            guildId: guildInfo.id,
            channelId: guildInfo.suggestionChannel,
        });
    }

    public async createComment(suggestion: SuggestionClass, guildInfo: Guild, commentInfo: ApiComment) {
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
                this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, commentInfo.id)
            )
        ) {
            this.sentThreadMessages.delete(
                this.createThreadMessageCompositeId(guildInfo.id, suggestion.apiData.id, commentInfo.id)
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

        const content = await this.replaceMessagePlaceholders(guildInfo.id, commentInfo.content);
        const author = await NamelessUser.getUserById(commentInfo.user.id, guildInfo.id, this.bot);
        if (!author) {
            return;
        }

        const authorAvatar = author.avatar_url || `https://cravatar.eu/helmavatar/${author.username.trim()}`;

        // Get webhook to send message as
        const webhook = await getWebhookForChannel(channel);

        const parts = splitOversizedMessage(this.fixContent(content), 2000);
        if (!parts.length) return;

        let threadMessage: Message | undefined;
        for (const part of parts) {
            if (webhook) {
                threadMessage = await webhook.send({
                    content: part,
                    username: commentInfo.user.username,
                    avatarURL: this.parseAvatarUrl(authorAvatar),
                    threadId: message.thread.id,
                });
            } else {
                const embed = this.bot.embeds.baseNoFooter();
                embed.setDescription(part);
                embed.setAuthor({ name: commentInfo.user.username, iconURL: this.parseAvatarUrl(authorAvatar) });
                threadMessage = await message.thread.send({ embeds: [embed] });
            }
        }

        if (!threadMessage) {
            this.bot.logger.error('There was no thread message! Did something go wrong???');
            return;
        }

        await Comment.create({
            suggestionId: suggestion.apiData.id,
            commentId: commentInfo.id,

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

    public async sendCommentToSite(msg: Message<true>) {
        const channel = msg.channel as ThreadChannel;
        const starterMessage = await channel.fetchStarterMessage();
        if (!starterMessage) {
            this.bot.logger.error('Starter message was null!');
            return;
        }

        const suggestionInfo = await Suggestion.findOne({
            where: { messageId: starterMessage.id, guildId: msg.guildId },
        });
        if (!suggestionInfo) {
            return;
        }

        const content = await this.replaceDiscordMentions(msg.guildId, msg.content);
        const authorId = msg.author.id;

        const response = await this.bot.suggestionsApi.sendComment(
            suggestionInfo.suggestionId,
            msg.guildId,
            content,
            authorId
        );
        if (!response) {
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

        if (response.error === 'nameless:cannot_find_user') {
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
        } else {
            this.sentThreadMessages.add(
                this.createThreadMessageCompositeId(msg.guildId, suggestionInfo.suggestionId, response.comment_id)
            );
        }
    }

    public async handleButtonInteraction(interaction: ButtonInteraction, interactionType: 'like' | 'dislike') {
        if (!(interaction.channel instanceof TextChannel)) {
            return; // Interaction is not in a text channel
        }

        await interaction.deferReply({ ephemeral: true });

        const suggestionInfo = await Suggestion.findOne({
            where: { messageId: interaction.message.id, guildId: interaction.guildId },
        });
        if (!suggestionInfo || !interaction.guildId || !interaction.channel) {
            return;
        }

        const suggestion = await SuggestionClass.getSuggestion(
            suggestionInfo.suggestionId,
            interaction.guildId,
            this.bot
        );
        const user = await NamelessUser.getUserByDiscordId(interaction.user.id, interaction.guildId, this.bot);
        if (!user) {
            return;
        }

        const mustBeRemoved =
            !(interactionType === 'like'
                ? suggestion.apiData?.likes.includes(user.id)
                : suggestion.apiData?.dislikes.includes(user.id)) || false;

        if (!interaction.guildId) return;

        // Attempt to send a like or dislike to the API
        const response = await this.bot.suggestionsApi.sendReaction(
            suggestionInfo.suggestionId,
            interaction.guildId,
            interactionType,
            interaction.user.id,
            mustBeRemoved
        );
        if (!response) {
            const str = await LanguageManager.getString(interaction.guildId, 'invalid-setup');
            const embed = this.bot.embeds.base();
            embed.setDescription('`❌` ' + str);

            try {
                interaction.user.send({ embeds: [embed] });
            } catch (e) {
                const sent = await interaction.channel.send({ embeds: [embed] });
                setTimeout(() => {
                    sent.delete();
                }, 5000);
            }
            return;
        }
        if (response.error == 'nameless:cannot_find_user') {
            const str = await LanguageManager.getString(interaction.guildId, 'suggestionHandler.cannot_find_user');
            const embed = this.bot.embeds.base();
            embed.setDescription('`❌` ' + str);
            interaction.editReply({ embeds: [embed] });
            return;
        }

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

    public async updateSuggestionEmbed(suggestion: SuggestionClass, guildInfo: Guild) {
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

        const embed = await this.createEmbed(guildInfo.id, suggestion.apiData, suggestion.dbData.url, authorAvatar);
        const components = this.getEmbedComponents({
            likes: parseInt(suggestion.apiData.likes_count),
            dislikes: parseInt(suggestion.apiData.dislikes_count),
        });
        await message.edit({ embeds: [embed], components: [components] });
    }

    public async removeDeletedComment(suggestion: SuggestionClass, commentId: string) {
        if (!suggestion.dbData || !suggestion.apiData) return;

        // Get the comment from our database
        const dbComment = await Comment.findOne({
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

    public async removeDeletedSuggestion(suggestion: SuggestionClass) {
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

    private async createEmbed(guildId: string, suggestion: ApiSuggestion, url: string, avatar: string) {
        const str = await LanguageManager.getString(
            guildId,
            'suggestionHandler.suggested_by',
            'user',
            suggestion.author.username
        );
        const description = await this.replaceMessagePlaceholders(guildId, suggestion.content);

        const embed = this.bot.embeds.base();
        if (suggestion.status.color) embed.setColor(suggestion.status.color as ColorResolvable);
        embed.setTitle(`#${suggestion.id} - ${this.stripLength(this.fixContent(suggestion.title), 100)}`);
        embed.setDescription(this.stripLength(this.fixContent(description), 4092));
        if (avatar) embed.setFooter({ text: str, iconURL: this.parseAvatarUrl(avatar) });
        else embed.setFooter({ text: str });
        embed.setURL(url);
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

    private stripLength(str: string, length: number) {
        if (str.length > length) {
            return str.substring(0, length - 3) + '...';
        }
        return str;
    }

    private parseAvatarUrl(url: string) {
        url = url.replace(/ +/g, ''); // Apparently names can have spaces in them?
        url = url.replace('.svg', '.png');
        return url;
    }

    private fixContent(content: string) {
        const map: Record<string, string> = {
            '&amp;': '&',
            '&#038;': '&',
            '&nbsp;': ' ',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'",
            '&#8217;': '’',
            '&#8216;': '‘',
            '&#8211;': '–',
            '&#8212;': '—',
            '&#8230;': '…',
            '&#8221;': '”',
        };
        return content.replace(/<br \/>/g, '').replace(/&[\w\d#]{2,5};/g, (m) => map[m] ?? m);
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

        const filteredSuggestions = apiSuggestions?.suggestions
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))
            .filter((s) => parseInt(s.id) > startFrom);

        // Loop through all suggestions and send them in their respective channel
        for (const shortSuggestion of filteredSuggestions) {
            const suggestion = await SuggestionClass.getSuggestion(shortSuggestion.id, guildId, this.bot);
            if (!suggestion.apiData) {
                continue;
            }
            if (suggestion.apiData.status.open == false) {
                this.bot.logger.debug('Suggestion is closed, skipping');
                continue;
            }
            this.bot.logger.debug(
                'Creating new suggestion from API. Suggestion ID: ' + chalk.yellow(suggestion.apiData.id)
            );

            await this.createSuggestion(suggestion, guildData);
            if (!suggestion.comments) {
                this.bot.logger.error(
                    `Error getting comments for suggestion ${suggestion.apiData.id} from API: ${JSON.stringify(
                        suggestion.comments
                    )}`
                );
                continue;
            }

            // Load all comments into the suggestion
            await suggestion.refresh();
            for (const comment of suggestion.comments.comments) {
                this.bot.logger.debug('Creating new comment from API. Comment ID: ' + chalk.yellow(comment.id));
                await this.createComment(suggestion, guildData, comment);
            }
        }
        this.bot.logger.debug('Finished sending all suggestions from API.');
    }

    private async recoverSuggestion(suggestion: SuggestionClass, guildData: Guild) {
        if (!suggestion.apiData) return;

        await this.createSuggestion(suggestion, guildData);
        await suggestion.refresh();
        if (!suggestion.dbData) {
            this.bot.logger.error(
                `Error getting suggestion ${suggestion.apiData.id} from database when attempting to recover it, full suggestion can be found below`
            );
            console.log(suggestion.apiData);
            console.log(guildData);
            return;
        }
        if (!suggestion.comments) {
            this.bot.logger.error(
                `Error getting comments for suggestion ${suggestion.apiData.id} from API: ${JSON.stringify(
                    suggestion.comments
                )}`
            );
            return;
        }

        // Load all comments into the suggestion
        await suggestion.refresh();
        for (let i = 0; i < suggestion.comments.comments.length - 1; i++) {
            const comment = suggestion.comments.comments[i];
            this.bot.logger.debug('Creating new comment from API. Comment ID: ' + chalk.yellow(comment.id));
            await this.createComment(suggestion, guildData, comment);
        }
    }

    private createThreadMessageCompositeId(
        guildId: string,
        suggestionId: string,
        commentId: number
    ): `${string}-${string}-${string}` {
        return `${guildId}-${suggestionId}-${commentId}`;
    }

    private async replaceMessagePlaceholders(guildId: string, content: string) {
        // User placeholders
        const regex = /\[user\](\d+)\[\/user\]/gm;
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const fullMatch = m[0];
            const numMatch = m[1];

            const apiCredentials = await Database.getApiCredentials(guildId);
            if (!apiCredentials) {
                return content;
            }

            const siteUser = await this.bot.suggestionsApi.getUserInfo(numMatch, guildId);
            if (!siteUser || siteUser.error || !siteUser.exists) {
                continue;
            }

            const url = new URL(apiCredentials.apiurl);
            content = content
                .split(fullMatch)
                .join(
                    `[@${siteUser.username}](${url.protocol}//${url.hostname}/profile/${encodeURIComponent(
                        siteUser.username
                    )})`
                );
        }

        // Suggestion placeholders
        const regex2 = /\[suggestion\](\d+)\[\/suggestion\]/gm;
        let m2;
        while ((m2 = regex2.exec(content)) !== null) {
            if (m2.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }

            const fullMatch = m2[0];
            const numMatch = m2[1];

            const suggestion = await SuggestionClass.getSuggestion(numMatch, guildId, this.bot);
            if (!suggestion.apiData) {
                continue;
            }

            const messageUrl = `https://discord.com/channels/${guildId}/${suggestion.dbData?.channelId}/${suggestion.dbData?.messageId}`;
            content = content.split(fullMatch).join(`[#${suggestion.apiData.id}](${messageUrl})`);
        }

        return content;
    }

    private async replaceDiscordMentions(guildId: string, content: string) {
        // Replacing literal discord mentions
        const regex = /<@!?(\d+)>/gm;
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            const fullMatch = m[0];
            const numMatch = m[1];

            // Fetch the user from the api
            const apiCredentials = await Database.getApiCredentials(guildId);
            if (!apiCredentials) {
                return content;
            }

            const user = await this.bot.users.fetch(numMatch).catch(() => undefined);
            let userMention = `@${user ? user.username : 'Unknown user'}`;

            const siteUser = await this.bot.suggestionsApi.getUserInfoByIntegrationId(numMatch, guildId);
            if (siteUser && !siteUser.error && !!siteUser.exists) {
                userMention = `[user]${siteUser.id}[/user]`;
            }

            content = content.split(fullMatch).join(userMention);
        }

        // Replacing suggestion mentions
        const regex2 = /#(\d+)/gm;
        let m2;
        while ((m2 = regex2.exec(content)) !== null) {
            if (m2.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }

            const fullMatch = m2[0];
            const numMatch = m2[1];

            const suggestion = await SuggestionClass.getSuggestion(numMatch, guildId, this.bot);
            if (!suggestion.apiData || !suggestion.apiData.id) {
                continue;
            }

            content = content.split(fullMatch).join(`[suggestion]${suggestion.apiData.id}[/suggestion]`);
        }

        return content;
    }
}
