import chalk from "chalk";
import express from "express";
import { Server } from "http";
import Database from "../database/Database";
import Logger from "../handlers/Logger";
import Bot from "./Bot";
import fetch from "node-fetch";

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

    private async getLocale(apiurl: String, apikey: String){
        const res = await fetch(
            `${apiurl}${apiurl.endsWith("/") ? "" : "/"}info`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apikey}`,
                },
            }
        ).catch(() => undefined)
        const json = await res?.json();
        return json.locale;
    }

    private async getUserLocale(apiurl: String, apikey: String, username: String){
        const res = await fetch(
            `${apiurl}${apiurl.endsWith("/") ? "" : "/"}users/username:${username}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apikey}`,
                },
            }
        ).catch(() => undefined)
        const json = await res?.json();
        return json.locale;
    }

    private async handleWebhook(req: express.Request, res: express.Response) {
        res.sendStatus(200);

        // Get guild data from database
        const guildData = await Database.getGuildDataByAuthorizationKey(req.params.id as string);
        if (!guildData) {
            this.logger.error(`No guild data found for authorization key ${req.query.id}`);
            return;
        }
        
        // Get website language
        const locale = await this.getLocale(guildData.apiurl, guildData.apikey);
        var language = await fetch(
            `https://raw.githubusercontent.com/partydragen/Nameless-Suggestions/main/upload/modules/Suggestions/language/${locale}.json`,
            {
                method: "GET",
            }
        ).catch(() => undefined)

        if (language?.status == 404){
            var language = await fetch(
                `https://raw.githubusercontent.com/partydragen/Nameless-Suggestions/main/upload/modules/Suggestions/language/en_UK.json`,
                {
                    method: "GET",
                }
            ).catch(() => undefined)
        }else{
            
        }

        const languagejson = await language?.json();

        const hook_new_suggestion = languagejson["general/hook_new_suggestion"].split(" ");
        
        // Get suggestion ID & check if its a comment or a new suggestion
        const suggestionId = req.body.embeds[0].title.split(" ")[0].slice(1);
        const isNewSuggestion = req.body.embeds[0].footer.text.includes(hook_new_suggestion[0] + " " + hook_new_suggestion[1]);

        // Get user language
        var isNewComment = false;
        var hook_new_comment;
        try{
            const username = req.body.embeds[0].footer.text.split(" ")[req.body.embeds[0].footer.text.split(" ").indexOf("-") - 1];
            const userlocale = await this.getUserLocale(guildData.apiurl, guildData.apikey, username);
            var userlanguage = await fetch(
                `https://raw.githubusercontent.com/partydragen/Nameless-Suggestions/main/upload/modules/Suggestions/language/${userlocale}.json`,
                {
                    method: "GET",
                }
            ).catch(() => undefined)

            if (userlanguage?.status == 404){
                var userlanguage = await fetch(
                    `https://raw.githubusercontent.com/partydragen/Nameless-Suggestions/main/upload/modules/Suggestions/language/en_UK.json`,
                    {
                        method: "GET",
                    }
                ).catch(() => undefined)
            }else{

            }

            const userlanguagejson = await userlanguage?.json();

            hook_new_comment = userlanguagejson["general/hook_new_comment"].split(" ");

            isNewComment = req.body.embeds[0].footer.text.includes(hook_new_comment[0] + " " + hook_new_comment[1]);

            // Try using website language
            if (!isNewSuggestion && !isNewComment) {
                hook_new_comment = languagejson["general/hook_new_comment"].split(" ");

                isNewComment = req.body.embeds[0].footer.text.includes(hook_new_comment[0] + " " + hook_new_comment[1]);
            }
        }catch{
            isNewComment = false;
        }
        
        // Get suggestion data from the api
        const suggestionData = await this.client.suggestionsApi.getSuggestion(suggestionId, guildData.id);
        if (!suggestionData) {
            this.logger.error(`No suggestion data found for suggestion ${suggestionId}`);
            return;
        }

        this.logger.debug("Received network request for suggestion with title " + chalk.yellow(suggestionData.title) + " for guild " + chalk.yellow(guildData.id) + " which should be sent to channel with id " + chalk.yellow(guildData.suggestionChannel));
        
        if (isNewSuggestion) {
            this.client.suggestions.createSuggestion(suggestionData, guildData, req.body.avatar_url);
        }

        if (isNewComment) {
            const author = req.body.embeds[0].footer.text.split(" ")[req.body.embeds[0].footer.text.split(" ").indexOf("-") - 1];
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

        if (!isNewSuggestion && !isNewComment) {
            this.logger.error(`Unknown webhook type. Received the following json body for the footer`);
            console.log(req.body.embeds[0].footer);
            return;
        }
    }
}
