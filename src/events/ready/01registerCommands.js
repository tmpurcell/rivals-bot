const { testServer, testServer2, speedeDemons } = require('../../../config.json');
const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
    try {
        const localCommands = getLocalCommands();
        const applicationCommands = await getApplicationCommands(client, speedeDemons);

        for (const localCommand of localCommands) {
            const { name, description, options } = localCommand;

            const existingCommand = await applicationCommands.cache.find(
                (cmd) => cmd.name === name
            );

            if (existingCommand) {
                if (localCommand.deleted) {
                    await applicationCommands.delete(existingCommand.id);
                    console.log(`Deleted command "${name}".`);
                    continue;
                }

                if (areCommandsDifferent(existingCommand, localCommand)) {
                    await applicationCommands.edit(existingCommand.id, {
                        description,
                        options,
                    });

                    console.log(`Edited Command "${name}".`)
                }
            } else {
                if (localCommand.deleted) {
                    continue;
                }

                await applicationCommands.create({
                    name,
                    description,
                    options,
                })

                console.log(`Registered command "${name}".`);
            }
        }
    } catch (error) {
        console.log(`there was an error: ${error}`);
    }
};
