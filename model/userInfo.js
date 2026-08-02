const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        profession: {
            type: String,
            default: "",
            trim: true
        },
        bio: {
            type: String,
            default: "",
            trim: true
        }
    },
    { 
        timestamps: true, 
        versionKey: false 
    }
);

module.exports = mongoose.model("UserInfo", userInfoSchema);