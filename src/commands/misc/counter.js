const { Client, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs'); // To read the text document

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const inputCharacter = interaction.options.getString('character'); // Get the character name
        const filePath = require('path').join(__dirname, '../../../counters.txt');

        try {
            // Normalize the input character name
            const normalizedCharacter = normalizeCharacterName(inputCharacter);

            // Read the text file
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Parse the text document into an object
            const countersData = parseCountersData(fileContent);

            // Find the data for the requested character
            const characterData = countersData[normalizedCharacter.toLowerCase()];

            if (!characterData) {
                // If the character is not found
                await interaction.reply({
                    content: `No counter information found for **${normalizedCharacter}**.`,
                    ephemeral: true,
                });
                return;
            }

            // Format the response
            let response = `**Character:** ${normalizedCharacter}\n`;
            response += characterData.hardCounter.length
                ? `**Hard Counter:** ${characterData.hardCounter.join(', ')}\n`
                : '';
            response += characterData.softCounter.length
                ? `**Soft Counter:** ${characterData.softCounter.join(', ')}`
                : '';

            // Send the response
            await interaction.reply({
                content: response.trim(), // Remove trailing newlines
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error retrieving the counter data. Please try again later.',
                ephemeral: true,
            });
        }
    },

    name: 'counter',
    description: 'Get hard and soft counters for a character',
    options: [
        {
            name: 'character',
            description: 'The name of the character to get counters for',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
};

/**
 * Parses the text document into a structured object.
 * @param {string} text - The raw content of the text document.
 * @returns {Object} A structured object with character names as keys.
 */
function parseCountersData(text) {
    const lines = text.split('\n');
    const data = {};

    let currentCharacter = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) continue; // Skip empty lines

        // Match character name
        const characterMatch = trimmedLine.match(/^(.+?):\s/);
        if (characterMatch) {
            currentCharacter = characterMatch[1].toLowerCase();
            data[currentCharacter] = { hardCounter: [], softCounter: [] };
        }

        // Match Hard Counter
        const hardCounterMatch = trimmedLine.match(/Hard Counter - (.+)/);
        if (hardCounterMatch && currentCharacter) {
            const hardCounters = hardCounterMatch[1].split(',').map((c) => c.trim());
            data[currentCharacter].hardCounter.push(...hardCounters);
        }

        // Match Soft Counter
        const softCounterMatch = trimmedLine.match(/Soft Counter - (.+)/);
        if (softCounterMatch && currentCharacter) {
            const softCounters = softCounterMatch[1].split(',').map((c) => c.trim());
            data[currentCharacter].softCounter.push(...softCounters);
        }
    }

    return data;
}

/**
 * Normalizes the input character name to account for abbreviations.
 * @param {string} input - The input character name.
 * @returns {string} The normalized character name.
 */
function normalizeCharacterName(input) {
    const abbreviationMap = {
        psy: 'Psylocke',
        wolv: 'Wolverine',
        wolvie: 'Wolverine',
        bp: 'Black Panther',
        strange: 'Dr. Strange',
        moon: 'Moon Knight',
        adam: 'Adam Warlock',
        hulk: 'Bruce Banner',
        captain: 'Captain America',
        cnd: 'Cloak and Dagger',
        invis: 'Invisible Woman',
        peni: 'Peni Parker',
        rocket: 'Rocket Racoon',
        scarlet: 'Scarlet Witch',
        squirrel: 'Squirrel Girl',
        punisher: 'The Punisher',
        bucky: 'Winter Soldier',
    };

    const lowerInput = input.toLowerCase(); // Normalize input to lowercase
    return abbreviationMap[lowerInput] || input; // Return full name if abbreviation exists, otherwise return original input
}
