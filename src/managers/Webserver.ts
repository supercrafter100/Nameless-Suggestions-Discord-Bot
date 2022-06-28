import chalk from "chalk";
import express from "express";
import { Server } from "http";
import Database from "../database/Database";
import Logger from "../handlers/Logger";
import Bot from "./Bot";

export default class {
    private logger = new Logger();
    private readonly app = express();
    private readonly server: Server;

    constructor(private readonly client: Bot) {
        this.server = new Server(this.app);
        this.logger.prefix = chalk.yellow("WEB");
        this.app.use(express.json());
    }

    public start() {
        this.logger.info("Starting webserver...");
        this.server.listen(process.env.PORT || 3000, () => {
            this.logger.info(
                "Web server started on port " + (process.env.PORT || 3000)
            );
        });
        this.registerEndpoints();
    }

    private registerEndpoints() {
        this.app.post("/webhook/:id", (req, res) => this.handleWebhook(req, res));
    }

    private async handleWebhook(req: express.Request, res: express.Response) {
        res.sendStatus(200);

        // Get suggestion ID & check if its a comment or a new suggestion
        const suggestionId = req.body.embeds[0].title.split(" ")[0].slice(1);
        const isNewSuggestion = req.body.embeds[0].footer.text.includes("New suggestion");
        const isNewComment = req.body.embeds[0].footer.text.includes("New comment");
        
        // Get guild data from database
        const guildData = await Database.getGuildDataByAuthorizationKey(req.params.id as string);
        if (!guildData) {
            this.logger.error(`No guild data found for authorization key ${req.query.id}`);
            return;
        }

        // Get suggestion data from the api
        const suggestionData = await this.client.suggestionsApi.getSuggestion(suggestionId, guildData.id);
        if (!suggestionData) {
            this.logger.error(`No suggestion data found for suggestion ${suggestionId}`);
            return;
        }
        
        if (isNewSuggestion) {
            this.client.suggestions.createSuggestion(suggestionData, guildData, req.body.avatar_url);
        }

        if (isNewComment) {
            const author = req.body.embeds[0].footer.text.split(" ")[3];
            const idTag = req.body.embeds[0].url.split("#")[1];
            const commentId = idTag.split("-")[1];

            const commentInfo = await this.client.suggestionsApi.getCommentInfo(suggestionId, commentId, guildData.id);
            if (!commentInfo) {
                this.logger.error(`No comment info found for comment ${commentId}`);
                return;
            }

            this.client.suggestions.createComment(suggestionData, guildData, {
                description: commentInfo?.content,
                author,
                avatar: req.body.avatar_url,
            });
        }
    }
}
