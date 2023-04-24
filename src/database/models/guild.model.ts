import { DataTypes, Model } from 'sequelize';
import { db } from '../..';

class Guild extends Model {
    declare id: string;
    declare apiurl: string;
    declare apikey: string;
    declare authorizationKey: string;
    declare suggestionChannel: string;
    declare language: string;
}

Guild.init(
    {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
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
            allowNull: true,
        },

        language: {
            type: DataTypes.STRING,
            defaultValue: 'en_UK',
            allowNull: false,
        },
    },
    { sequelize: db }
);

export default Guild;
