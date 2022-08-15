import { Collection } from "discord.js";
import Guild from "./models/guild.model";

export default class Database {

    private static guildInfo = new Collection<string, Guild>();

    public static async getGuildData(guildId: string) {
        if (Database.guildInfo.has(guildId)) return Database.guildInfo.get(guildId)!;
        let guild = await Guild.findOne({ where: { id: guildId } });
        if (!guild)
           guild = await Guild.create({ id: guildId }); 
        Database.guildInfo.set(guildId, guild);
        return guild;
    }

    public static async getGuildDataByAuthorizationKey(authorizationKey: string) {
        const guildData = await Guild.findOne({ where: { authorizationKey } });
        return guildData;
    }

    public static async getApiCredentials(guildId: string) {
        const guildData = await Database.getGuildData(guildId);
        if (!guildData.apiurl) {
            return;
        }
        
        return {
            apiurl: guildData.apiurl + (guildData.apiurl.endsWith("/") ? "" : "/"),
            apikey: guildData.apikey,
        };
    }
}
