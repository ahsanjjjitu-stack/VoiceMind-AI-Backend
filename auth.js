const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
const { OAuth2Client } = require("google-auth-library");
const User = require("./model/users");
const UserInfo = require("./models/userInfo"); 

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


    console.log("--> Save Profile Request Body:", req.body);


    const { userId, name, email, profession, bio } = req.body;


    if (!userId) {
        return res.status(400).json({ success: false, message: "userId প্রয়োজন!" });
    }

    // Validation 2: Mongo ObjectId check
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ success: false, message: "অবৈধ userId ফরম্যাট!" });
    }

    // Validation 3: Name & Email check
    if (!name || name.trim() === "") {
        return res.status(400).json({ success: false, message: "Name required!" });
    }
    if (!email || email.trim() === "") {
        return res.status(400).json({ success: false, message: "Email required!" });
    }




    try {

        // Check if user exists
        const updateProfile = await UserInfo.findOneAndUpdate(
            { userId: userId },
            {
                set: {
                    name: name.trim(),
                    email: email.trim(),
                    profession: profession ? profession.trim() : "",
                    bio: bio ? bio.trim() : ""
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
                
            

        console.log("✅ Profile Saved/Updated for UserId:", userId);


      res.status(200).json({
         success: true,
         message: "প্রোফাইল সফলভাবে সেভ হয়েছে! 🔥",
       userId: updatedProfile.userId.toString(),
    name: updatedProfile.name,
    email: updatedProfile.email,
    profession: updatedProfile.profession,
    bio: updatedProfile.bio
});
        



    }
    catch (error) {
        console.error("❌ User Info Save Error:", error);
        res.status(500).json({ success: false, message: "User info save failed!" });
    }




});











module.exports = router;