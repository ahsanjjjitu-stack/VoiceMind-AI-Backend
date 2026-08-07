const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({

    userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            default: "Untitled Recording",
            trim: true
        },
        category: {
            type: String,
            default: "General",
            trim: true
        },
        audioUrl: {
            type: String,
            required: true 
        },
        transcript: {
            type: String,
            default: ""
        },
        summary: {
            type: [String], 
            default: []
        }
    },
    { 
        timestamps: true,
        versionKey: false

});


module.exports = mongoose.model('Recording', recordingSchema);