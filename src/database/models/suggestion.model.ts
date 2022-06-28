import { DataTypes, Model } from "sequelize";
import { db } from "../..";

class Suggestion extends Model {
    declare id: string;
    declare suggestionId: string;
    declare messageId: string;
    declare status: string;
    declare url: string;
    declare guildId: string;
    declare channelId: string;
}

Suggestion.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    suggestionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    messageId: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    channelId: {
        type: DataTypes.STRING,
        allowNull: false
    },

    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    url: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, { sequelize: db });

export default Suggestion;