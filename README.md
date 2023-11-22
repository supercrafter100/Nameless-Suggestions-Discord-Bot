# Nameless-Suggestions Discord Bot

![Infographic of bot](https://i.imgur.com/wtCKREd.png)

## Publicly hosted instance

If you want to try out the bot, there is a publicly hosted instance that can be invited [here](https://nameless-suggestions.supercrafter100.com). Ideally you'd use this version as it gets updated for the latest namelessmc version + gets the newest features the quickest. Please note that I cannot guarantee that this instance will remain online forever. As long as I can cover the hosting costs and have interest in this project, it will stay online.

If you want to support this project or my work in general, it would be really appreciated if you donated over at https://ko-fi.com/supercrafter100 ❤️

<hr>

## Self hosting (no support provided, if you don't know what you're doing, please use my hosted instance instead)

1. Download NodeJS [here](https://nodejs.org/en/)
2. Clone the repository
3. Install all dependencies by executing `npm install -D`
4. Build the bot `npx tsc`
5. Create a `.env` file and put in the contents of the `.example.env` file that is included. Then fill in the values
   > `TOKEN`: This should be your Discord Bot's token</br>
   > `GUILDID`: This should be the ID of your Discord Server [how?](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)</br>
   > `DOMAIN`: This should be the URL of the SERVER you're hosting the bot on. For example, if your IP is `5.5.5.5`, and you're running the bot on port `4032` with no SSL, your `DOMAIN` would be `http://5.5.5.5:4032`</br>
   > `DB_*`: These values should be the same as your nameless mc database.</br>
7. Run the bot using `npm run start`

## Setup
1. Ensure the bot is invited to the server (one you specified in `GUILDID`)
2. Run `/settings set apikey
   > The options should be the same (or similar if reverse proxied) as the ones in Staff CP -> Configuration -> API
3. This should automatically create a webhook in NamelessMC, you can check in Staff CP -> Configuration -> Webhooks
   > If it didn't, run `/setup` and follow the instructions there
4. Finally, just run `/settings set suggestionchannel`
   > The option should be the name of the channel you want suggestions to pop into. ( This can only be a text channel, nothing else. )

**NOTE**: If you want users to be able to react and write in suggestion threads. They require to have their discord account linked to their NamelessMC one. This requires you to set up the nameless-link discord bot so users can achieve this.

<hr>

## Issues

If you encounter any issues, please open up a github issue
