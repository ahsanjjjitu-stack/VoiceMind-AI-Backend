const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const User = require("./model/users");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



// google login router

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





    }
    catch (error) {
    console.error(error);
    console.error("Google Auth Error:", error);
    res.status(401).json({ success: false, message: "Invalid Google Token" });

    }



});







// profile update router

router.post("/update-profile", async (req, res) => {
    const { userId, name, profession, bio } = req.body;

    // Validation
    if (!userId || !name || !profession || !bio) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        // Fix: Pass { _id: userId } object in query
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId }, 
            {
                name: name,
                profession: profession ? profession : "",
                bio: bio ? bio : "",
                isProfileUpdated: true,
                updatedAt: Date.now(),
            }, 
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: "ইউজার পাওয়া যায়নি!" 
            });
        }

        res.status(200).json({
            success: true,
            message: "প্রোফাইল সফলভাবে আপডেট হয়েছে! 🔥",
            id: updatedUser._id,
            email: updatedUser.email,
            name: updatedUser.name,
            profession: updatedUser.profession,
            bio: updatedUser.bio,
            isProfileUpdated: updatedUser.isProfileUpdated
            
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});





module.exports = router;


