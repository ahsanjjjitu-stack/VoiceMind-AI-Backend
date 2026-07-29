const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const User = require("../model/users");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


router.post("/google/login", async (req, res) => {

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


module.exports = router;


