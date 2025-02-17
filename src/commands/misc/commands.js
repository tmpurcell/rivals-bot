const { Client } = require('discord.js');

module.exports = {
    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        // Message content for the command list
        const commandList = `
**Command List:**

**/commands**
    Displays a list of all current commands that the bot is able to complete!

**/add**  
   Update the database with your playable characters. /add +class then provides a dropdown menu based on the class you have selected. It will auto update your db with the hero selected!  
   *Logic automatically removes duplicate entries regardless of capitalization and format (e.g., "starlord" and "Star-Lord").*

**/learning**
      This allows you to add characters to the learning class. This is in a different command due to the complexity of the code. Select any number of characters from 
      any of the three classes. Tank, DPS, Healer!

 **/remove**  
   Allows you to remove a character from your list.  
   *You can only remove one character at a time, primarily in place for correcting misspellings or moving someone from the wrong class.*

 **/show**  
   Show the playable characters you or someone else has entered into their database.  
   *Takes an optional argument of a player's @ (mention) or leave blank to see your own list.*

 **/counter**  
   Provides information on the Hard and Soft counters for a character.  
   *Accepts full or abbreviated names (e.g., "Psy", "Bucky", "Wolvie").*

**/request**
    Have you thought of a command that you would like to see implemented? Fill out the fields and create a request! I will begin attempting these and improving the bot!

 **/ban**  
   ... Self-explanatory. However, no one has permission to use this unless given access to the ban command.


---

Use the respective commands to interact with the system. If you need further help with any command, feel free to ask!
        `;

        // Reply with the list
        await interaction.reply({
            content: commandList,
            ephemeral: true, // Keep the list private for the user
        });
    },

    name: 'commands',
    description: 'Display a list of all available commands and their usage.',
};
