require('dotenv').config();
const { Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, GatewayIntentBits } = require('discord.js'); // Added GatewayIntentBits import
const RunningCharacter = require('../../models/runningCharList');
const activeCollectors = new Map();

// Bot and your Discord IDs
const authorizedIds = [process.env.WRINK_ID.trim(), process.env.CLIENT_ID]; // Replace with your actual Discord ID and bot ID

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const userId = interaction.user.id;

        // Check if the user has permission to use this command
        if (!authorizedIds.includes(userId)) {
            return interaction.reply({
                content: "You don't have permission to access this command.",
                ephemeral: true,
            });
        }

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

        // Check and stop any previous active collector
        if (activeCollectors.has(userId)) {
            const oldCollector = activeCollectors.get(userId);
            oldCollector.stop(); // Stop the old collector
        }

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
        });

        // Store the new collector in activeCollectors map
        activeCollectors.set(userId, collector);

        collector.on('collect', async (btnInteraction) => {
            const selectedClass = btnInteraction.customId;

            // Prompt user to input character name
            const modal = new ModalBuilder()
                .setCustomId('characterInputModal')
                .setTitle(`Enter Name for ${selectedClass}`);

            const characterInput = new TextInputBuilder()
                .setCustomId('characterInputField')
                .setLabel('Enter character name:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Enter character name');

            const modalRow = new ActionRowBuilder().addComponents(characterInput);
            modal.addComponents(modalRow);

            // Show the modal
            await btnInteraction.showModal(modal);

            try {
                // Wait for the modal submission
                const modalInteraction = await btnInteraction.awaitModalSubmit({
                    filter: (i) => i.user.id === btnInteraction.user.id,
                    time: 10000, // Wait up to 10 seconds
                });

                const characterName = modalInteraction.fields.getTextInputValue('characterInputField');

                // Format the character name properly (capitalize the first letter of each word)
                const formattedCharacterName = characterName
                    .trim()
                    .split(' ')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');

                // Save the class and character to the database
                const newChar = new RunningCharacter({
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    class: selectedClass,
                    character: formattedCharacterName,
                });

                await newChar.save();

                await modalInteraction.reply({
                    content: `Character **${formattedCharacterName}** of class **${selectedClass}** added successfully!`,
                    ephemeral: true,
                });

                // Remove buttons from the original message
                await interaction.editReply({
                    content: 'Class selection and character input complete.',
                    components: [],
                });

            } catch (error) {
                console.error(error);
                await btnInteraction.followUp({
                    content: 'You did not submit the modal in time, or an error occurred.',
                    ephemeral: true,
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            activeCollectors.delete(userId); // Clean up the collector from activeCollectors
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'You did not select a class in time. Please try again.',
                    components: [],
                });
            }

            collector.stop();
        });
    },

    name: 'runningchars',
    description: 'Add or update your running characters in the database',
    options: [],
};

// Bot login using token from .env file
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.login(process.env.TOKEN); // Using the bot token from the .env file
