import { DataTypes, Model } from "sequelize";
import { db } from "../..";

class Comment extends Model {
    declare id: string;

    declare suggestionId: string;
    declare commentId: string;

    declare guildId: string;
    declare channelId: string;
    declare messageId: string;
}

Comment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    suggestionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    commentId: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    messageId: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    channelId: {
        type: DataTypes.STRING,
        allowNull: false
    },

    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, { sequelize: db });

export default Comment;