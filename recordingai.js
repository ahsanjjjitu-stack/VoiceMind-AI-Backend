const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const Recording = require("./model/model.recording");


// multer config
const upload = multer({dest: "uploads/"});


// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



// gemini ai clinet initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// router , audio file upload and cloudinary save and server save 
router.post("/process-recording", upload.single("audio"), async (req, res) => {

    let localFilePath = null;


    try {

        const { userId, category } = req.body;
        const audioFile = req.file;


        if (!audioFile) {
            return res.status(400).json({ success: false, message: "অডিও ফাইল পাওয়া যায়নি!" });
        }

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid userId প্রয়োজন!" });
        }

        localFilePath = audioFile.path;

        console.log("--> Uploading audio to Cloudinary...");



        // cloudinary uploaded in audio file 
        const cloudinaryResult = await cloudinary.uploader.upload(audioFile.path, {
            resource_type: "video",
            folder: "voicemind_recordings",
        });

        const audioUrl = cloudinaryResult.secure_url;
        console.log("✅ Cloudinary Audio URL Generated:", audioUrl);





        // gemini ai file upload for transcript and summary
        console.log("--> Processing Recording with Gemini AI...");

        const uploadResult = await ai.files.upload({
            file: localFilePath,
            mimeType: audioFile.mimetype || "audio/m4a"
        });
        


        console.log("--> Gemini File Uploaded successfully. Generating Transcript & Summary...");



        // prompt for gemini ai 
        // Multilingual Prompt for Gemini AI
        const prompt = `
        You are an AI assistant processing an audio recording.

        Task 1: Generate a full transcript of the spoken audio.
        Task 2: Create a clean list of key summary points from the audio.
        Task 3: Create a short 3-5 word title for this recording based on its context.

        CRITICAL LANGUAGE INSTRUCTION:
        - Detect the primary language spoken in the audio recording (e.g., Bangla, English, Hindi, etc.).
        - You MUST provide the "title", "transcript", and all "summary" bullet points in the EXACT SAME LANGUAGE that was spoken in the audio.
        - If the audio is in Bangla, the output JSON values MUST be in Bangla script.
        - Do NOT translate the content to English unless the audio itself is in English.

         Please format your response strictly in valid JSON as shown below:
         {
        "title": "Short Title Here",
        "transcript": "Full speech transcript here...",
        "summary": [
        "Key takeaway point 1",
        "Key takeaway point 2",
        "Key takeaway point 3"
        ]
        }
        `;






        // generate connect with gemini ai 
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [uploadResult, prompt],
            config: {
                responseMimeType: "application/json"
            }
        });




        // parse ai json 
        const aiData = JSON.parse(response.text);

        const title = aiData.title || (category ? `${category} Session` : "AI Voice Note");
        const transcript = aiData.transcript || "";
        const summary = Array.isArray(aiData.summary) ? aiData.summary : [];

        console.log("✅ AI Response Generated Successfully!");





        // 3. Save Recording to MongoDB
        const newRecording = new Recording({
            userId: new mongoose.Types.ObjectId(userId),
            title: title,
            category: category || "General",
            audioUrl: audioUrl,
            transcript: transcript,
            summary: summary
        });

        await recording.save();



        // 4. Temporary local file cleanup
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }




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

