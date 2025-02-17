// runningCharList.js
const { Schema, model } = require('mongoose');

// Define the character schema
const runningCharSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    },
    character: {
        type: [String],
        required: true
    }
});

// Create and export the model for running characters
module.exports = model('RunningCharacter', runningCharSchema);
