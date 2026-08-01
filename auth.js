const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const User = require("./model/users");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Google Login Router
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

        let user = await User.findOne({ googleId });

        if (!user) {
            user = new User({
                googleId,
                email,
            });
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            userId: user._id,
            email: user.email
        });

    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ success: false, message: "Invalid Google Token" });
    }
});

// 2. Profile Update Router
router.post("/update-profile", async (req, res) => {
    console.log("--> Incoming Body:", req.body);

    // Single time destructuring
    const { userId, name, profession, bio } = req.body;

    // Validation Check
    if (!userId) {
        console.log("❌ Error: userId is missing");
        return res.status(400).json({ success: false, message: "userId প্রয়োজন!" });
    }

    if (!name || (typeof name === 'string' && name.trim() === "")) {
        console.log("❌ Error: name is missing or empty");
        return res.status(400).json({ success: false, message: "Name required!" });
    }

    try {
        // Construct clean update object
        const updateData = {
            name: name.toString().trim(),
            profession: profession ? profession.toString().trim() : "",
            bio: bio ? bio.toString().trim() : "",
            isProfileComplete: true,
            updatedAt: Date.now()
        };

        // Update directly using findByIdAndUpdate
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

        // Response sending
        res.status(200).json({
            success: true,
            message: "প্রোফাইল সফলভাবে আপডেট হয়েছে! 🔥",
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