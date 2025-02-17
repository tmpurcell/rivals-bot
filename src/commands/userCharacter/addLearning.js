const { Client, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const characterUpdate = require('../../models/characterUpdate');
const runningCharList = require('../../models/runningCharList');

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const userId = interaction.user.id;

        // Defer reply
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        // Fetch available characters for each class (Tank, DPS, Healer, Learning)
        const availableClasses = ['tank', 'dps', 'healer', 'learning'];
        let characterRows = [];

        // For each class, fetch the characters and build dropdowns
        for (const className of availableClasses) {
            let availableCharacters = await runningCharList.find({ class: className });

            if (availableCharacters.length === 0) {
                continue;
            }

            // Collect unique characters for this class
            const characterSet = new Set();
            availableCharacters.forEach((char) => {
                char.character.forEach((characterName) => {
                    if (characterName) characterSet.add(characterName);
                });
            });

            const characterList = Array.from(characterSet);

            if (characterList.length === 0) {
                continue;
            }

            // Create a dropdown for each class
            const characterMenu = new StringSelectMenuBuilder()
                .setCustomId(`selectCharacter_${className}`)
                .setPlaceholder(`Select characters for ${className.charAt(0).toUpperCase() + className.slice(1)}`)
                .setMaxValues(characterList.length) // Allow selection of all options
                .addOptions(
                    characterList.map((name) => ({
                        label: name,
                        value: name,
                    }))
                );

            const characterRow = new ActionRowBuilder().addComponents(characterMenu);
            characterRows.push(characterRow);
        }

        // Create a cancel button
        const cancelButton = new ButtonBuilder()
            .setCustomId('cancelAdd')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const cancelButtonRow = new ActionRowBuilder().addComponents(cancelButton);

        // Create a submit button (initially hidden or not active)
        const submitButton = new ButtonBuilder()
            .setCustomId('submitAdd')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

        const submitButtonRow = new ActionRowBuilder().addComponents(submitButton);

        // Send the dropdowns for each class and the cancel button
        if (characterRows.length === 0) {
            await interaction.followUp({
                content: 'No available characters found for the selected classes.',
                ephemeral: true,
            });
            return;
        }

        await interaction.followUp({
            content: `Select characters to add to your profile for each class:`,
            components: [...characterRows, cancelButtonRow, submitButtonRow],
            ephemeral: true,
        });

        // Collect user selections
        const filter = (selectInteraction) => selectInteraction.user.id === userId;
        const charCollector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.StringSelect,
            time: 60000, // Time extended due to multiple dropdowns
        });

        // Add selected characters to the learning class
        const selectedCharacters = {
            learning: [], 
        };

        charCollector.on('collect', async (charInteraction) => {
            await charInteraction.deferUpdate();
            const selectedClass = charInteraction.customId.split('_')[1];

            // Always add selected characters to the learning class
            if (selectedClass === 'learning' || selectedClass !== 'learning') {
                selectedCharacters.learning.push(...charInteraction.values);
            }

            await charInteraction.followUp({
                content: `✅ Selected characters for Learning: **${selectedCharacters.learning.join(', ')}**`,
                ephemeral: true,
            });

            // Enable submit button once at least one character is selected
            if (selectedCharacters.learning.length > 0) {
                submitButton.setDisabled(false);
                await interaction.editReply({
                    components: [...characterRows, cancelButtonRow, submitButtonRow],
                    ephemeral: true,
                });
            }
        });

        // Handle the cancel button interaction
        const buttonCollector = interaction.channel.createMessageComponentCollector({
            filter: (btnInteraction) => btnInteraction.user.id === userId && btnInteraction.customId === 'cancelAdd',
            time: 60000, // Time allowed to click cancel button
        });

        buttonCollector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();
            await btnInteraction.followUp({
                content: `❌ You have canceled the character addition process.`,
                ephemeral: true,
            });
            charCollector.stop(); // Stop the character selection collector
        });

        // Handle the submit button interaction
        const submitCollector = interaction.channel.createMessageComponentCollector({
            filter: (btnInteraction) => btnInteraction.user.id === userId && btnInteraction.customId === 'submitAdd',
            time: 60000, // Time allowed to submit
        });

        submitCollector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();

            try {
                // Fetch the existing user document to check current characters
                const existingUser = await characterUpdate.findOne({ userId, class: 'learning' });

                const existingCharacters = existingUser ? new Set(existingUser.character) : new Set();
                const newCharacters = [...new Set(selectedCharacters.learning)]; // Ensure uniqueness

                // Find duplicates
                const duplicates = newCharacters.filter((char) => existingCharacters.has(char));

                if (duplicates.length > 0) {
                    await interaction.followUp({
                        content: `⚠️ The following characters already exist in your Learning class: **${duplicates.join(', ')}**`,
                        ephemeral: true,
                    });
                    return;
                }

                // Use findOneAndUpdate to update or create a new document
                const updatedUser = await characterUpdate.findOneAndUpdate(
                    { userId, class: 'learning' },  // Search condition
                    { $addToSet: { character: { $each: newCharacters } } }, // Add only new characters
                    { upsert: true, new: true } // Create if not exists & return updated document
                );

                await interaction.followUp({
                    content: `✅ Your Learning class has been updated with characters: **${updatedUser.character.join(', ')}**`,
                    ephemeral: true,
                });
            } catch (err) {
                console.error('Error updating user characters:', err);
                await interaction.followUp({
                    content: `❌ There was an error saving your characters. Please try again later.`,
                    ephemeral: true,
                });
            }
        });

        // End the collection process
        charCollector.on('end', async () => {
            // If the user canceled, there's nothing to save, so don't send the added prompt
            if (buttonCollector.listenerCount('collect') === 0) {
                return;
            }
        });
    },

    name: 'learning',
    description: 'Add or update your characters in the database',
    deleted: false,
};
