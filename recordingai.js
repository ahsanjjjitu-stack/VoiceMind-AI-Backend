const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const Recording = require("./model/model.recording");

// multer config
const upload = multer({ 
    dest: "uploads/",
    limits: { fileSize: 25 * 1024 * 1024 }
});

// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// gemini ai client initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// router , audio file upload and cloudinary save and server save 
router.post("/process-recording", upload.single("audio"), async (req, res) => {
    let localFilePath = null;




    try {
        const { userId, category } = req.body;
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({ success: false, message: "অডিও ফাইল পাওয়া যায়নি!" });
        }

        if (!userId || !mongoose.isValidObjectId(userId)) {
            if(audioFile.path && fs.existsSync(audioFile.path)){
                fs.unlinkSync(audioFile.path);
            }
            return res.status(400).json({ success: false, message: "Valid userId প্রয়োজন!" });
        }

        localFilePath = audioFile.path;





        console.log("--> Uploading audio to Cloudinary...");





        // cloudinary upload
        const cloudinaryResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "video",
            folder: "voicemind_recordings",
        });




        const audioUrl = cloudinaryResult.secure_url;
        console.log("✅ Cloudinary Audio URL Generated:", audioUrl);


        

        // gemini ai file upload setup
        console.log("--> Processing Recording with Gemini AI...");

        let mimeType = audioFile.mimetype;
        if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'audio/*') {
            if (audioFile.originalname && audioFile.originalname.endsWith('.mp3')) {
                mimeType = 'audio/mp3';
            } else if (audioFile.originalname && audioFile.originalname.endsWith('.wav')) {
                mimeType = 'audio/wav';
            } else {
                mimeType = 'audio/m4a'; // অ্যান্ড্রয়েডের জন্য ডিফল্ট
            }
        }

        console.log(`--> Uploading audio to Gemini AI File API with mimeType: ${mimeType}...`);

        // 1. Gemini File API তে ফাইল আপলোড
       const uploadResult = await ai.files.upload({
            file: localFilePath,
            config: {
            mimeType: mimeType // 👈 আসল সমাধান এখানে
           }
          });

          

        console.log("--> Gemini File Uploaded successfully. Generating Transcript & Summary...");

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

        // 2. generateContent-এ সঠিকভাবে fileData ডিফাইন করা
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    fileData: {
                        mimeType: uploadResult.mimeType || mimeType,
                        fileUri: uploadResult.uri
                    }
                },
                prompt
            ],
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

        // ⚠️ আপনার কোডে "recording.save()" ছিল, সেটা ঠিক করে "newRecording.save()" করা হয়েছে
        await newRecording.save();

        console.log("✅ Recording Session Saved to Database!");
        
        return res.status(200).json({
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

    } catch (error) {
        console.error("❌ Process Recording Error:", error);
        return res.status(500).json({
            success: false,
            message: "Recording processing failed!",
            error: error.message
        });
    } finally {
        // 4. Cleanup local file in finally block so it always deletes
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
});












// get recodings with pagination + Analytics (Total hours and total summaries)

router.get("/all-recordings/:userId", async (req, res) => {


    try {

        const { userId } = req.params;


        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;


        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Need valid userId!" });
        }



        const userObjectId = new mongoose.Types.ObjectId(userId);


        const recordings = await Recording.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);


        const totalRecordings = await Recording.countDocuments({ userId: userObjectId });
        const hasMore = skip + recordings.length < totalRecordings;



        const analytics = await Recording.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: null,
                    totalDurationSeconds: { $sum: { $ifNull: ["$duration", 0] } }, 
                    totalSummariesCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $isArray: "$summary" }, { $gt: [{ $size: "$summary" }, 0] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);





        const totalSeconds = analytics.length > 0 ? analytics[0].totalDurationSeconds : 0;
        const totalHours = (totalSeconds / 3600).toFixed(1);

        const totalSummaries = analytics.length > 0 ? analytics[0].totalSummariesCount : totalRecordings;






        return res.status(200).json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalRecordings / limit),
            hasMore: hasMore,
            totalHours: String(totalHours),
            totalSummaries: totalSummaries,
            totalRecordings: totalRecordings,
            recordings : recordings
        });
        





    }
    catch(error){
        console.error("❌ Fetch Recordings Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recordings!",
            error: error.message
        });
    }


});




module.exports = router;