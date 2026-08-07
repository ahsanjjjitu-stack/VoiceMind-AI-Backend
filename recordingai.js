const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const Recording = require("./model/model.recording");


// multer config
const upload = multer({dest: "uploads/"});


// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// router , audio file upload and cloudinary save and server save 
router.post("/process-recording", upload.single("audio"), async (req, res) => {


    try {

        const { userId, category } = req.body;
        const audioFile = req.file;


        if (!audioFile) {
            return res.status(400).json({ success: false, message: "অডিও ফাইল পাওয়া যায়নি!" });
        }

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid userId প্রয়োজন!" });
        }

        console.log("--> Uploading audio to Cloudinary...");






        // cloudinary uploaded in audio file 
        const cloudinaryResult = await cloudinary.uploader.upload(audioFile.path, {
            resource_type: "video",
            folder: "voicemind_recordings",
        });

        const audioUrl = cloudinaryResult.secure_url;
        console.log("✅ Cloudinary Audio URL Generated:", audioUrl);





        // 2. ডামি AI Data (পরের স্টেপে আমরা আসল Gemini AI এর সাথে লিংক করব)
        const mockTranscript = "Today we discussed the system requirements and UI layout for VoiceMind AI application.";
        const mockSummary = [
            "Discussed UI and UX layout improvements",
            "Added Cloudinary integration for audio files",
            "Configured MongoDB Recording schema with summary list"
        ];
        const mockTitle = category ? `${category} Session` : "AI Voice Note";







        // 3. Save Recording to MongoDB
        const recording = new Recording({
            userId: new mongoose.Types.ObjectId(userId),
            title: mockTitle,
            category: category || "General",
            audioUrl: audioUrl,
            transcript: mockTranscript,
            summary: mockSummary
        });

        await recording.save();




        console.log("✅ Recording Session Saved to Database!");
        res.status(200).json({
            success: true,
            message: "Recording Session Saved to Database!",
            recording: {
                id: newRecording._id.toString(),
                title: newRecording.title,
                category: newRecording.category,
                audioUrl: newRecording.audioUrl,
                transcript: newRecording.transcript,
                summary: newRecording.summary,
                createdAt: newRecording.createdAt
            }
        });

        

    }
    catch(error){
           console.error("❌ Process Recording Error:", error);
            res.status(500).json({ 
            success: false, 
            message: "Recording processing failed!", 
            error: error.message 
        });             
    }
    
});




module.exports = router;

