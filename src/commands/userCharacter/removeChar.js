const { Client, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Character = require('../../models/characterUpdate');
const activeCollectors = new Map();

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        try {
            // Defer the reply to avoid multiple response errors
            await interaction.deferReply({ ephemeral: true });

            // Stop any previous collector for this user
            if (activeCollectors.has(userId)) {
                const existingCollector = activeCollectors.get(userId);
                existingCollector.stop(); // Stop any previous collector
                activeCollectors.delete(userId); // Remove it from the map
            }

            // Ensure a proper response if no characters are found
            const characters = await Character.find({ userId, guildId });

            if (characters.length === 0) {
                await interaction.editReply({
                    content: `No characters found for <@${userId}>.`,
                    components: []
                });
                return;
            }

            let rows = [];
            let currentRow = new ActionRowBuilder();

            characters.forEach((char, index) => {
                if (Array.isArray(char.character)) {
                    char.character.forEach((individualChar, charIndex) => {
                        if (currentRow.components.length >= 5) {
                            rows.push(currentRow);
                            currentRow = new ActionRowBuilder();
                        }
                        currentRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`remove-${index}-${charIndex}`)
                                .setLabel(`${individualChar} (${char.class})`)
                                .setStyle(ButtonStyle.Danger)
                        );
                    });
                }
            });

            if (currentRow.components.length > 0) {
                rows.push(currentRow);
            }

            await interaction.editReply({
                content: `Select a character to remove from your list:`,
                components: rows
            });

            const filter = (btnInteraction) => btnInteraction.user.id === userId;

            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                componentType: ComponentType.Button,
            });

            activeCollectors.set(userId, collector);  // Register the new collector

            collector.on('collect', async (btnInteraction) => {
                const [_, buttonIndex, charIndex] = btnInteraction.customId.split('-');
                const characterToRemove = characters[parseInt(buttonIndex)].character[parseInt(charIndex)];

                try {
                    // Update the character list by removing the selected character
                    await Character.updateOne(
                        { userId, guildId, class: characters[parseInt(buttonIndex)].class },
                        { $pull: { character: characterToRemove } }
                    );

                    // Clear the buttons and stop the collector
                    await btnInteraction.update({
                        content: `Character removed successfully: **${characterToRemove}**.`,
                        components: [],  // Clear the buttons
                        ephemeral: true
                    });

                    collector.stop();  // Stop the collector as the action is complete

                } catch (error) {
                    console.error(error);
                    await btnInteraction.update({
                        content: 'Error removing character. Try again later.',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', () => {
                activeCollectors.delete(userId);  // Clean up the collector once done
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: 'There was an error fetching your characters.',
                components: []
            });
        }
    },

    name: 'remove',
    description: 'Remove a character from your character list',
    options: [],  // No member option, only the user invoking the command can remove their characters
};
