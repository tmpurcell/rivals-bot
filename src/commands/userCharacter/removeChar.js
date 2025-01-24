const { Client, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Character = require('../../models/characterUpdate');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Interaction} interaction 
     */
    callback: async (client, interaction) => {
        const userId = interaction.user.id; // Get the user ID of the person invoking the command
        const guildId = interaction.guildId; // Get the guild ID

        try {
            // Query the database for all characters of the invoking user in the guild
            const characters = await Character.find({ userId, guildId });

            if (characters.length === 0) {
                await interaction.reply({
                    content: `No characters found for <@${userId}>.`,
                    ephemeral: true,
                });
                return;
            }

            // Create an array of action rows
            let rows = [];
            let currentRow = new ActionRowBuilder();

            // Iterate through each class and its characters to create a button for each character
            characters.forEach((char, index) => {
                const formattedCharacter = Array.isArray(char.character) ? char.character.join(', ') : char.character;

                // For each character in the list, create a button
                if (Array.isArray(char.character)) {
                    char.character.forEach((individualChar, charIndex) => {
                        // If the current row already has 5 buttons, create a new row
                        if (currentRow.components.length >= 5) {
                            rows.push(currentRow);
                            currentRow = new ActionRowBuilder();
                        }

                        currentRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`remove-${index}-${charIndex}`)  // Unique button ID for each character
                                .setLabel(`${individualChar} (${char.class})`)
                                .setStyle(ButtonStyle.Danger)  // Red style for removal
                        );
                    });
                } else {
                    // If it's a single character (not an array), add it as a button
                    if (currentRow.components.length >= 5) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                    }

                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`remove-${index}-0`)  // Only one character in the list
                            .setLabel(`${formattedCharacter} (${char.class})`)
                            .setStyle(ButtonStyle.Danger)
                    );
                }
            });

            // Push any remaining rows
            if (currentRow.components.length > 0) {
                rows.push(currentRow);
            }

            await interaction.reply({
                content: `Select a character to remove from your list:`,
                components: rows,
                ephemeral: true,  // Make the message ephemeral so others can’t see it
            });

            // Create a filter to ensure only the user who initiated the interaction can respond
            const filter = (btnInteraction) => btnInteraction.user.id === userId;  // Ensure only the user who invoked the command can interact

            // Wait for the user to click a button (up to 30 seconds)
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                componentType: ComponentType.Button, // Listen for button clicks
                time: 30000, // 30 seconds to wait for a response
            });

            collector.on('collect', async (btnInteraction) => {
                const [buttonType, buttonIndex, charIndex] = btnInteraction.customId.split('-');  // Get the indices from the button ID
                const characterToRemove = characters[parseInt(buttonIndex)].character[parseInt(charIndex)];  // Get the specific character

                try {
                    // Remove the character from the database
                    await Character.updateOne(
                        { userId, guildId, class: characters[parseInt(buttonIndex)].class },  // Ensure correct class is targeted
                        { $pull: { character: characterToRemove } }, // Pull the exact character to remove
                        { new: true } // Return the updated document
                    );

                    // Notify the user about the successful removal
                    await btnInteraction.update({
                        content: `Character removed successfully! Character: **${characterToRemove}**.`,
                        components: [], // Remove the buttons after the action
                    });
                } catch (error) {
                    console.error(error);
                    await btnInteraction.reply({
                        content: 'There was an error removing your character. Please try again later.',
                        ephemeral: true,
                    });
                }

                collector.stop(); // Stop the collector once a button is clicked
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({
                        content: 'You did not select a character in time. Please try again.',
                        components: [], // Remove the buttons
                    });
                }
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error fetching your characters.',
                ephemeral: true,
            });
        }
    },

    name: 'remove',
    description: 'Remove a character from your character list',
    options: [],  // No member option, only the user invoking the command can remove their characters
};
