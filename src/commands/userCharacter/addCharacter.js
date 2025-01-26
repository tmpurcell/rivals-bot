const {
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType,
    ComponentType,
} = require('discord.js');
const Character = require('../../models/characterUpdate');

// Helper function to format character names (capitalize words)
function formatCharacterName(name) {
    return name
        .trim()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Helper function to normalize names for duplicate checking
function normalizeName(name) {
    return name
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
}

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // Create buttons for class selection
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tank').setLabel('Tank').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dps').setLabel('DPS').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('healer').setLabel('Healer').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('learning').setLabel('Learning').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: 'Select a class for your character(s):',
            components: [row],
            ephemeral: true,
        });

        const filter = (btnInteraction) => btnInteraction.user.id === userId;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30000,
        });

        collector.on('collect', async (btnInteraction) => {
            const selectedClass = btnInteraction.customId;

            const modal = new ModalBuilder()
                .setCustomId('characterInputModal')
                .setTitle(`Enter Characters for ${selectedClass}`);

            const characterInput = new TextInputBuilder()
                .setCustomId('characterInputField')
                .setLabel('Enter characters (comma-separated):')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Character1, Character2, Character3')
                .setRequired(true);

            const modalRow = new ActionRowBuilder().addComponents(characterInput);
            modal.addComponents(modalRow);

            await btnInteraction.showModal(modal);

            client.once('interactionCreate', async (modalInteraction) => {
                if (
                    modalInteraction.type !== InteractionType.ModalSubmit ||
                    modalInteraction.customId !== 'characterInputModal'
                ) {
                    return;
                }

                const characterInput = modalInteraction.fields.getTextInputValue('characterInputField');
                const charactersToAdd = characterInput
                    .split(',')
                    .map((name) => formatCharacterName(name.trim())); // Format character names

                try {
                    // Retrieve existing characters in the selected class
                    const existingEntry = await Character.findOne({
                        userId,
                        guildId,
                        class: selectedClass,
                    });

                    const existingCharacters = existingEntry?.character || [];

                    // Normalize existing and input characters for comparison
                    const normalizedExisting = existingCharacters.map(normalizeName);
                    const filteredCharacters = charactersToAdd.filter(
                        (char) => !normalizedExisting.includes(normalizeName(char))
                    );

                    if (filteredCharacters.length === 0) {
                        await modalInteraction.reply({
                            content: 'No new characters were added because they already exist (or are similar).',
                            ephemeral: true,
                        });
                        return;
                    }

                    // Add filtered characters to the database
                    await Character.findOneAndUpdate(
                        { userId, guildId, class: selectedClass },
                        { $push: { character: { $each: filteredCharacters } } },
                        { upsert: true, new: true }
                    );

                    await modalInteraction.reply({
                        content: `Characters added successfully! Class: **${selectedClass}**, Added: **${filteredCharacters.join(', ')}**.`,
                        ephemeral: true,
                    });

                    // Remove buttons from the original message
                    await interaction.editReply({
                        content: 'Class selection and character input complete.',
                        components: [],
                    });
                } catch (error) {
                    console.error(error);
                    await modalInteraction.reply({
                        content: 'There was an error adding your characters. Please try again later.',
                        ephemeral: true,
                    });
                }
            });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'You did not select a class in time. Please try again.',
                    components: [],
                });
            }
        });
    },

    name: 'add',
    description: 'Add or update your characters in the database',
    options: [],
};
