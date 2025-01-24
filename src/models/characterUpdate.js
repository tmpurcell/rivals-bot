const { Schema, model } = require('mongoose');

const playerSchema = new Schema({
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

module.exports = model('character', playerSchema);