const { Client, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs'); // To handle file operations

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        // Prompt for the required information (Command Name & Description)
        const commandName = interaction.options.getString('command_name'); // Get the command name
        const commandSlash = interaction.options.getString('slash_command');
        const commandDescription = interaction.options.getString('description'); // Get the command description
        const username = interaction.user.username; // Get the username of the person submitting the request
        const timestamp = new Date().toISOString(); // Current timestamp

        // Ensure that both fields are filled
        if (!commandName || !commandDescription) {
            await interaction.reply({
                content: 'Please provide both the command name and the description.',
                ephemeral: true,
            });
            return;
        }

        // Format the request entry
        const requestEntry = `
        Command Name: ${commandName}
        Slash Command: ${commandSlash}
        Description: ${commandDescription}
        Requested by: ${username}
        Timestamp: ${timestamp}
        -------------------------------------------
        `;

        // Define the file path (store it in the same directory or adjust path)
        const filePath = require('path').join(__dirname, '../../../requests.txt');

        try {
            // Append the request entry to the text file
            fs.appendFileSync(filePath, requestEntry);

            // Confirm to the user that their request has been submitted
            await interaction.reply({
                content: `Your command request for **${commandName}** has been successfully submitted! Thank you for your suggestion.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error writing to file:', error);
            await interaction.reply({
                content: 'There was an error submitting your request. Please try again later.',
                ephemeral: true,
            });
        }
    },

    name: 'request',
    description: 'Submit a request for a new command to be added.',
    options: [
        {
            name: 'command_name',
            description: 'The name of the command you are requesting',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'slash_command',
            description: 'The / command for your command',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'description',
            description: 'A short description of what the command should do',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
};
