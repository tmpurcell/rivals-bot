const { 
    Client, 
    ApplicationCommandOptionType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const Character = require('../../models/characterUpdate');

// Helper function to format character names (capitalize first letter of each word)
function formatCharacterName(name) {
    return name
        .trim()  // Remove any leading/trailing spaces
        .split(' ')  // Split the name into words based on spaces
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter of each word
        .join(' ');  // Join the words back together with a space
}

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Interaction} interaction 
     */
    callback: async (client, interaction) => {
        const characterNames = interaction.options.getString('character'); // Get the character input
        const userId = interaction.user.id; // Get the user ID
        const guildId = interaction.guildId; // Get the guild ID

        // Split the character input into an array if multiple names are provided (comma-separated)
        const charactersToAdd = characterNames.split(',').map(name => formatCharacterName(name));  // Apply formatting here

        // Create buttons for class selection
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tank')
                .setLabel('Tank')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dps')
                .setLabel('DPS')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('healer')
                .setLabel('Healer')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('learning')
                .setLabel('Learning')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: 'Select a class for your character(s):',
            components: [row],
            ephemeral: true,
        });

        // Create a filter to ensure only the user who initiated the interaction can respond
        const filter = (btnInteraction) => btnInteraction.user.id === interaction.user.id;

        // Wait for the user to click a button (up to 30 seconds)
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button, // Ensure it listens for button clicks
            time: 30000, // 30 seconds
        });

        collector.on('collect', async (btnInteraction) => {
            const selectedClass = btnInteraction.customId; // Get the class from button ID

            try {
                // 1. First, find if the character exists in the "Learning" class
                for (const character of charactersToAdd) {
                    const learningEntry = await Character.findOne({
                        userId,
                        guildId,
                        class: 'learning', // Check in the Learning class
                    });

                    if (learningEntry && learningEntry.character.includes(character)) {
                        // 2. If character exists in "Learning", remove it from "Learning"
                        await Character.updateOne(
                            { userId, guildId, class: 'learning' },
                            { $pull: { character: character } } // Remove character from "Learning"
                        );
                    }
                }

                // 3. Now, find and update the selected class (Healer, DPS, or Tank)
                await Character.findOneAndUpdate(
                    { userId, guildId, class: selectedClass }, // Query to match user, guild, and class
                    { $push: { character: { $each: charactersToAdd } } }, // Add the characters to the selected class
                    { upsert: true, new: true } // Create new document if it doesn't exist, return updated doc
                );

                // Update the original reply to remove buttons
                await btnInteraction.update({
                    content: `Characters updated successfully! Class: **${selectedClass}**, Added: **${charactersToAdd.join(', ')}**.`,
                    components: [], // Remove the buttons
                });
            } catch (error) {
                console.error(error);
                await btnInteraction.reply({
                    content: 'There was an error updating your characters. Please try again later.',
                    ephemeral: true,
                });
            }

            collector.stop(); // Stop the collector once a button is clicked
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: 'You did not select a class in time. Please try again.',
                    components: [], // Remove the buttons
                });
            }
        });
    },

    name: 'add',
    description: 'Add or update your characters in the database',
    options: [
        {
            name: 'character',
            description: 'Enter characters of 1 class separated by a comma',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
};
