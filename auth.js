const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
const { OAuth2Client } = require("google-auth-library");
const User = require("./model/users");
const UserInfo = require("./model/userInfo"); 

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

        let user = await User.findOneAndUpdate(
              { email: email },
              {
                  $setOnInsert: { googleId: googleId, createdAt: Date.now() },
                  $set: { updatedAt: Date.now() }
              },
                 { new: true, upsert: true, setDefaultsOnInsert: true }
          );


        console.log("✅ Google Auth Successful for UserId:", user._id.toString());




      // Response-এ শুধু userId আর email পাঠানো হচ্ছে
        res.status(200).json({
            success: true,
            message: "লগইন সফল হয়েছে!",
            userId: user._id.toString(),
            email: user.email
        });



    } catch (error) {
        console.error("❌ Google Auth Error:", error);
        res.status(401).json({ success: false, message: "Invalid Google Token" });
    }
});













// user information fetch
router.post("/user-info", async (req, res) => {
    console.log("--> Received Body in Backend:", req.body); 

    const { userId, name, email, profession, bio } = req.body;

    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ success: false, message: "Valid userId প্রয়োজন!" });
    }

    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name এবং Email পাঠাতে হবে!" });
    }

    try {
        const updatedProfile = await UserInfo.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            {
                $set: {
                    name: name,
                    email: email,
                    profession: profession,
                    bio: bio
                }
            },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );

        console.log("✅ Saved Document:", updatedProfile);

        res.status(200).json({
            success: true,
            message: "প্রোফাইল সফলভাবে সেভ হয়েছে! 🔥",
            userId: updatedProfile.userId.toString(),
            name: updatedProfile.name,
            email: updatedProfile.email,
            profession: updatedProfile.profession,
            bio: updatedProfile.bio
        });

    } catch (error) {
        console.error("❌ Save Profile Error:", error);
        res.status(500).json({ success: false, message: "User info save failed!", error: error.message });
    }
});











module.exports = router;