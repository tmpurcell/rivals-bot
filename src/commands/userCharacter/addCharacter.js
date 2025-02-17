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
        // Get class from command
        const selectedClass = interaction.options.getString('class'); 

        // Defer reply
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        // Fetch available characters for the selected class
        let availableCharacters = await runningCharList.find({ class: selectedClass });

        if (availableCharacters.length === 0) {
            await interaction.followUp({
                content: `No available characters found for ${selectedClass}.`,
                ephemeral: true,
            });
            return;
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
            await interaction.followUp({
                content: `No characters found for ${selectedClass}.`,
                ephemeral: true,
            });
            return;
        }

        // Create a dropdown for character selection
        const characterMenu = new StringSelectMenuBuilder()
            .setCustomId(`selectCharacter_${selectedClass}`)
            .setPlaceholder(`Select characters for ${selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)}`)
            .setMaxValues(characterList.length) // Allow selection of all options
            .addOptions(
                characterList.map((name) => ({
                    label: name,
                    value: name,
                }))
            );

        const characterRow = new ActionRowBuilder().addComponents(characterMenu);

        // Create a cancel button
        const cancelButton = new ButtonBuilder()
            .setCustomId('cancelAdd')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const cancelButtonRow = new ActionRowBuilder().addComponents(cancelButton);

        // Create a submit button
        const submitButton = new ButtonBuilder()
            .setCustomId('submitAdd')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

        const submitButtonRow = new ActionRowBuilder().addComponents(submitButton);

        // Send the dropdown and buttons
        await interaction.followUp({
            content: `Select characters to add to your profile for **${selectedClass}**:`,
            components: [characterRow, cancelButtonRow, submitButtonRow],
            ephemeral: true,
        });

        // Collect user selections
        const filter = (selectInteraction) => selectInteraction.user.id === userId;
        const charCollector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.StringSelect,
            time: 60000, // 1-minute timeout
        });

        // Store selected characters for the chosen class
        const selectedCharacters = {
            [selectedClass]: [], 
        };

        charCollector.on('collect', async (charInteraction) => {
            await charInteraction.deferUpdate();

            // Store selected characters
            selectedCharacters[selectedClass] = charInteraction.values;

            await charInteraction.followUp({
                content: `✅ Selected characters for **${selectedClass}**: **${selectedCharacters[selectedClass].join(', ')}**`,
                ephemeral: true,
            });

            // Enable submit button once at least one character is selected
            if (selectedCharacters[selectedClass].length > 0) {
                submitButton.setDisabled(false);
                await interaction.editReply({
                    components: [characterRow, cancelButtonRow, submitButtonRow],
                    ephemeral: true,
                });
            }
        });

        // Handle the cancel button interaction
        const buttonCollector = interaction.channel.createMessageComponentCollector({
            filter: (btnInteraction) => btnInteraction.user.id === userId && btnInteraction.customId === 'cancelAdd',
            time: 60000,
        });

        buttonCollector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();
            await btnInteraction.followUp({
                content: `❌ You have canceled the character addition process.`,
                ephemeral: true,
            });
            charCollector.stop();
        });

        // Handle the submit button interaction
        const submitCollector = interaction.channel.createMessageComponentCollector({
            filter: (btnInteraction) => btnInteraction.user.id === userId && btnInteraction.customId === 'submitAdd',
            time: 60000,
        });

        submitCollector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();

            try {
                // Fetch existing user document for the selected class
                const existingUser = await characterUpdate.findOne({ userId, class: selectedClass });
                const existingCharacters = existingUser ? new Set(existingUser.character) : new Set();
                const newCharacters = [...new Set(selectedCharacters[selectedClass])]; // Ensure uniqueness

                // Find duplicates
                const duplicates = newCharacters.filter((char) => existingCharacters.has(char));

                if (duplicates.length > 0) {
                    await interaction.followUp({
                        content: `⚠️ The following characters already exist in your **${selectedClass}** class: **${duplicates.join(', ')}**`,
                        ephemeral: true,
                    });
                    return;
                }

                // Fetch the Learning class user document
                const learningUser = await characterUpdate.findOne({ userId, class: 'learning' });
                const learningCharacters = learningUser ? new Set(learningUser.character) : new Set();

                // Remove any characters being added to the selected class from Learning
                const charactersToRemoveFromLearning = newCharacters.filter((char) => learningCharacters.has(char));

                if (charactersToRemoveFromLearning.length > 0) {
                    // Remove these characters from the Learning class
                    await characterUpdate.findOneAndUpdate(
                        { userId, class: 'learning' },
                        { $pull: { character: { $in: charactersToRemoveFromLearning } } }
                    );
                    await interaction.followUp({
                        content: `⚠️ The following characters were removed from your Learning class: **${charactersToRemoveFromLearning.join(', ')}**`,
                        ephemeral: true,
                    });
                }

                // Update or create a new document for the selected class
                const updatedUser = await characterUpdate.findOneAndUpdate(
                    { userId, class: selectedClass },
                    { $addToSet: { character: { $each: newCharacters } } },
                    { upsert: true, new: true }
                );

                await interaction.followUp({
                    content: `✅ Your **${selectedClass}** class has been updated with characters: **${updatedUser.character.join(', ')}**`,
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
            if (buttonCollector.ended) return;
        });
    },

    name: 'add',
    description: 'Add or update your characters in the database',
    options: [
        {
            name: 'class',
            description: 'The class to add characters to',
            type: 3,
            required: true,
            choices: [
                { name: 'Tank', value: 'tank' },
                { name: 'DPS', value: 'dps' },
                { name: 'Healer', value: 'healer' },
            ],
        },
    ],
};
