const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // 👈 ১. mongoose Import ফিক্সড
const { OAuth2Client } = require("google-auth-library");
const User = require("./model/users");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Google Login Router (Fixed & Robust)
router.post("/google-login", async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: "idToken is required" });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email } = payload;

        console.log("--> Google Login Attempt for Email:", email);

        // upsert: true দিলে ইউজার না থাকলে অটো সেভ করবে, থাকলে আপডেট করবে
        let user = await User.findOneAndUpdate(
            { email: email }, 
            { 
                $setOnInsert: { googleId: googleId, createAt: Date.now() },
                $set: { updatedAt: Date.now() }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log("✅ User Saved/Found in DB with ID:", user._id.toString());

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            userId: user._id.toString(), 
            email: user.email,
            isProfileComplete: user.isProfileComplete || false
        });

    } catch (error) {
        console.error("❌ Google Auth Error:", error);
        res.status(500).json({ success: false, message: "Google authentication failed" });
    }
});

// 2. Profile Update Router
router.post("/update-profile", async (req, res) => {
    console.log("--> Incoming Body:", req.body);

    const { userId, name, profession, bio } = req.body;

    // Validation 1: userId missing check
    if (!userId) {
        console.log("❌ Error: userId is missing");
        return res.status(400).json({ success: false, message: "userId প্রয়োজন!" });
    }

    // Validation 2: Invalid Mongo ObjectId check (🚨 CastError prevention)
    if (!mongoose.isValidObjectId(userId)) {
        console.log("❌ Error: Invalid Mongo ObjectId ->", userId);
        return res.status(400).json({ success: false, message: "অবৈধ userId ফরম্যাট!" });
    }

    // Validation 3: Name check
    if (!name || (typeof name === 'string' && name.trim() === "")) {
        console.log("❌ Error: name is missing or empty");
        return res.status(400).json({ success: false, message: "Name required!" });
    }

    try {
        const updateData = {
            name: name.toString().trim(),
            profession: profession ? profession.toString().trim() : "",
            bio: bio ? bio.toString().trim() : "",
            isProfileComplete: true,
            updatedAt: Date.now()
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: "ইউজার পাওয়া যায়নি!" 
            });
        }

        // Clean Response
        res.status(200).json({
            success: true,
            message: "প্রোফাইল সফলভাবে আপডেট হয়েছে! 🔥",
            userId: updatedUser._id.toString(), // 👈 অ্যান্ড্রয়েডের সুবিধার্থে userId এবং id দুটোই রাখা নিরাপদ
            id: updatedUser._id.toString(),
            email: updatedUser.email,
            name: updatedUser.name,
            profession: updatedUser.profession,
            bio: updatedUser.bio,
            isProfileComplete: updatedUser.isProfileComplete
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;