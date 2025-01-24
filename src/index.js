// Rivals Discord Bot

require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const TOKEN = process.env.TOKEN;
const mongoose = require('mongoose');
const eventHandler = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        eventHandler(client);
        client.login(TOKEN);
    } catch (error) {
        console.log(`Error: ${error}`);
    }
})();