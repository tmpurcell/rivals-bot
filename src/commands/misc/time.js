const { Client, ApplicationCommandOptionType } = require('discord.js');
const moment = require('moment-timezone'); // Import moment-timezone

// A simple mapping of locales to timezones (you can expand this list)
const localeToTimezone = {
    'en-US': 'America/New_York', // EST
};

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        // Get the user's locale
        const userLocale = interaction.user.locale;

        // Default timezone is EST (if the locale isn't in our list)
        let userTimezone = localeToTimezone[userLocale] || 'America';

        // Get the current time in the user's timezone
        const userTime = moment.tz(userTimezone).format('h:mm A'); // e.g., 10:00 PM

        // Define the time zones you want to convert to
        const timeZones = [
            { name: 'EST' },
            { name: 'CST' },
            { name: 'MST' },
            { name: 'PST' },
        ];

        // Get the current times for each timezone
        const times = timeZones.map(tz => {
            return `${tz.name}: ${moment.tz(tz.zone).format('h:mm A')}`;
        });

        // Combine the user's time and other time zones
        const response = [
            `Your Time (${userTimezone}): ${userTime}`,
            ...times
        ].join('\n');

        // Send the response to the user
        await interaction.reply({
            content: response,
            ephemeral: true,
        });
    },
    
    // Set to false if begins working properly
    deleted: true,

    name: 'time',
    description: 'Get the current time in your timezone and other US time zones.',
    options: [
        {
            name: 'timezone',
            description: 'The timezone of the user (e.g., "America/New_York"). If not provided, defaults to EST.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
};
