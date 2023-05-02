import chalk from 'chalk';
import express from 'express';
import { Server } from 'http';
import { Suggestion } from '../classes/Suggestion';
import Database from '../database/Database';
import Logger from '../handlers/Logger';
import Bot from './Bot';

export default class {
    private logger = new Logger();
    private readonly app = express();
    private readonly server: Server;

    constructor(private readonly client: Bot) {
        this.server = new Server(this.app);
        this.logger.prefix = chalk.yellow('WEB');
        this.app.use(express.json());
    }

    public start() {
        this.logger.info('Starting webserver...');
        this.server.listen(process.env.PORT || 3000, () => {
            this.logger.info('Web server started on port ' + (process.env.PORT || 3000));
        });
        this.registerEndpoints();
    }

    private registerEndpoints() {
        this.app.post('/webhook/:id', (req, res) => this.handleWebhook(req, res));
    }

    private async handleWebhook(req: express.Request, res: express.Response) {
        res.sendStatus(200);

        if (req.body.embeds?.length && (!req.body.embeds[0].footer || !req.body.embeds[0].footer.text)) {
            return; // Invalid webhook data from an unsupported event
        }

        // Get suggestion ID & check if its a comment or a new suggestion (we have to support both webhook types for now)
        const suggestionId = !req.body.embeds
            ? req.body.suggestion_id
            : req.body.embeds[0].title?.split(' ')[0].slice(1);
        const isNewSuggestion = !req.body.embeds
            ? req.body.event === 'newSuggestion'
            : req.body.embeds[0]?.footer.text.includes('New suggestion');
        const isNewComment = !req.body.embeds
            ? req.body.event === 'newSuggestionComment'
            : req.body.embeds[0]?.footer.text.includes('New comment');
        const isVote = req.body.event === 'userSuggestionVote';
        const isCommentDelete = req.body.event === 'deleteSuggestionComment';
        const isSuggestionDelete = req.body.event === 'deleteSuggestion';
        const isSuggestionUpdate = req.body.event === 'updateSuggestion';

        if (
            !suggestionId ||
            (!isNewSuggestion &&
                !isNewComment &&
                !isVote &&
                !isCommentDelete &&
                !isSuggestionDelete &&
                !isSuggestionUpdate)
        ) {
            this.logger.error(`Unknown webhook data... The follow body was present:`);
            console.log(req.body);
            return;
        }

        // Get guild data from database
        const guildData = await Database.getGuildDataByAuthorizationKey(req.params.id as string);
        if (!guildData) {
            this.logger.error(`No guild data found for authorization key ${req.query.id}`);
            return;
        }

        // Get suggestion data from the api
        const suggestion = await Suggestion.getSuggestion(suggestionId, guildData.id, this.client).catch();
        if (!suggestion.apiData && !isSuggestionDelete) {
            this.logger.error(
                `No suggestion data found for suggestion ${suggestionId} which was meant to go to guild ${guildData.id}`
            );
            return;
        }

        let type = 'new suggestion';
        if (isNewComment) type = 'comment';
        if (isCommentDelete) type = 'comment delete';
        if (isVote) type = 'vote';
        if (isSuggestionDelete) type = 'suggestion delete';
        if (isSuggestionUpdate) type = 'suggestion updated';

        this.logger.debug(
            'Received network request for suggestion with title ' +
                chalk.yellow(suggestion.apiData ? suggestion.apiData.title : 'unknown (deleted)') +
                ' for guild ' +
                chalk.yellow(guildData.id) +
                ' which should be sent to channel with id ' +
                chalk.yellow(guildData.suggestionChannel) +
                '.' +
                ' It is a ' +
                chalk.yellow(type)
        );

        if (isNewSuggestion) {
            this.client.suggestions.createSuggestion(suggestion, guildData);
        }

        if (isNewComment) {
            const commentId = !req.body.embeds
                ? req.body.comment_id
                : req.body.embeds[0]?.url.split('#')[1]?.split('-')[1];

            const commentInfo = await this.client.suggestionsApi.getCommentInfo(suggestionId, commentId, guildData.id);
            if (!commentInfo) {
                this.logger.error(`No comment info found for comment ${commentId}`);
                return;
            }

            this.client.suggestions.createComment(suggestion, guildData, commentInfo);
        }

        if (isVote) {
            this.client.suggestions.updateSuggestionEmbed(suggestion, guildData);
        }

        if (isCommentDelete) {
            this.client.suggestions.removeDeletedComment(suggestion, req.body.comment_id);
        }

        if (isSuggestionDelete) {
            this.client.suggestions.removeDeletedSuggestion(suggestion);
        }

        if (isSuggestionUpdate) {
            this.client.suggestions.updateSuggestionEmbed(suggestion, guildData);
        }
    }
}
