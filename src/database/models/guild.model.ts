import { DataTypes, Model } from "sequelize";
import { db } from "../..";

class Guild extends Model {
    declare id: string;
    declare apiurl: string;
    declare apikey: string;
    declare authorizationKey: string;
    declare suggestionChannel: string;
}

Guild.init({
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },

    apiurl: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    apikey: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    authorizationKey: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    suggestionChannel: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, { sequelize: db });




export default Guild;