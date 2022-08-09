import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import Bot from "../managers/Bot";
import Embeds from "../util/Embeds";

export default class extends Command {
    public name = "setup";
    public description = "Setup the discord bot";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        const client = interaction.client as Bot;

        // Step 1, introduction & requesting api key
        const embed = client.embeds
            .base()
            .setDescription(
                [
                    "Thank you for using the bot!",
                    "To get started, you will need to follow the steps below:",
                    "`1.` Head over to your website and log into StaffCP.",
                    "`2.` Go to `Configuration > Api` and find your api key and api url.",
                    "`3.` Execute `/settings set apikey <your api url> <your api key>` in this discord.",
                    "`4.` Generate an authorization key by using `/settings set authkey`.",
                    "`5.` Go to your website. Then `Configuration > Webhooks` and create a new webhook.",
                    "`6.` Execute `/webhookurl` in this discord and copy the webhook url. Put that into the webhook url field on the site and set the webhook type to `Normal`.",
                    "`7.` Enable the \"New suggestion\" and \"New suggestion comment\" events for this webhook",
                    "`8.` Click save",
                    "`9.` Set up your suggestion channel by using `/settings set suggestionchannel <#channel>`",
                    "`10.` You are now finished! Try creating a suggestion on your site and see if it works!",
                    "",
                    "**NOTE:** If you want users to be able to react and write in suggestion threads. They require to have their discord account linked to their NamelessMC one. This requires you to set up the nameless-link discord bot so users can achieve this.",
                    "*If you encounter any issues, feel free to open a github issue or contact me on discord via discord.gg/nameless*"
                ].join("\n")
            );
        interaction.reply({
            embeds: [embed],
        });
    }
}
