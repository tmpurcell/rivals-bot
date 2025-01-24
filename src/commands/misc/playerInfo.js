const { Client, ApplicationCommandOptionType } = require('discord.js');
const Character = require('../../models/characterUpdate');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Interaction} interaction 
     */
    callback: async (client, interaction) => {
        const userId = interaction.options.getUser('member')?.id || interaction.user.id; // Get the specified member or the command user
        const guildId = interaction.guildId; // Get the guild ID

        try {
            // Query the database for all characters of the specified member in the guild
            const characters = await Character.find({ userId, guildId });

            if (characters.length === 0) {
                await interaction.reply({
                    content: `No characters found for <@${userId}>.`,
                    ephemeral: true,
                });
                return;
            }

            // Define the desired class order
            const classOrder = ['tank', 'dps', 'healer', 'learning'];

            // Filter out classes with no characters
            const filteredCharacters = characters.filter((char) => {
                // Check if the class has any characters
                return Array.isArray(char.character) ? char.character.length > 0 : char.character;
            });

            // Sort the characters to ensure the order of classes is always Tank, DPS, Healer, Learning
            const sortedCharacters = filteredCharacters.sort((a, b) => {
                const aIndex = classOrder.indexOf(a.class.toLowerCase());
                const bIndex = classOrder.indexOf(b.class.toLowerCase());
                return aIndex - bIndex;
            });

            if (sortedCharacters.length === 0) {
                await interaction.reply({
                    content: `No characters found for <@${userId}> in any class.`,
                    ephemeral: true,
                });
                return;
            }

            // Format the characters into a displayable message
            const characterList = sortedCharacters
                .map((char) => {
                    // Ensure character is an array and join its elements with ", "
                    const formattedCharacter = Array.isArray(char.character) ? char.character.join(', ') : char.character;
                    // Format the output to have Class and Character(s) on the same line
                    return `**Class:** ${char.class}\n**Character(s):** ${formattedCharacter}`;
                })
                .join('\n\n'); // Separate each character entry with a line break for readability

            await interaction.reply({
                content: `Characters for <@${userId}>:\n${characterList}`,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error fetching the character list.',
                ephemeral: true,
            });
        }
    },

    name: 'show',
    description: 'Display all characters and classes of a specified member',
    options: [
        {
            name: 'member',
            description: 'Select whose characters you want to display',
            type: ApplicationCommandOptionType.User,
            required: false, // Allow displaying the user's own characters if no member is specified
        },
    ],
};
