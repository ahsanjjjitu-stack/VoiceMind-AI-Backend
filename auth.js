const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
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











module.exports = router;