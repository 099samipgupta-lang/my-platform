require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

app.use(express.json());

// Serve all files inside the public folder
app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// Backend health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "My Platform backend is running"
    });
});

// Video / image upload endpoint
app.post(
    "/api/upload",
    upload.single("video"),
    async (req, res) => {

        try {

            // Make sure a file was selected
            if (!req.file) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "No video or image selected"
                });
            }

            // Get user's Supabase access token
            const authHeader =
                req.headers.authorization;

            if (
                !authHeader ||
                !authHeader.startsWith("Bearer ")
            ) {
                return res.status(401).json({
                    status: "error",
                    message:
                        "You must be logged in"
                });
            }

            const accessToken =
                authHeader.substring(7);

            // Create Supabase client
            // using the logged-in user's token
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                {
                    global: {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                }
            );

            // Verify the logged-in user
            const {
                data: userData,
                error: userError
            } =
                await supabase.auth.getUser(
                    accessToken
                );

            if (
                userError ||
                !userData.user
            ) {
                return res.status(401).json({
                    status: "error",
                    message:
                        "Invalid or expired login session"
                });
            }

            const userId =
                userData.user.id;

            // Get information sent by frontend
            const title =
                req.body.title ||
                req.file.originalname;

            const description =
                req.body.description || "";

            const category =
                req.body.category ||
                "Other";

            // Detect video or image
            const contentType =
                req.file.mimetype.startsWith(
                    "image/"
                )
                    ? "image"
                    : "video";

            // Create unique storage path
            const fileName =
                `${userId}/${Date.now()}-${req.file.originalname}`;

            // Upload file to Supabase Storage
            const {
                error: uploadError
            } =
                await supabase.storage
                    .from("Videos")
                    .upload(
                        fileName,
                        req.file.buffer,
                        {
                            contentType:
                                req.file.mimetype,
                            upsert: false
                        }
                    );

            if (uploadError) {
                return res.status(500).json({
                    status: "error",
                    message:
                        uploadError.message
                });
            }

            // Get public URL
            const {
                data: publicUrlData
            } =
                supabase.storage
                    .from("Videos")
                    .getPublicUrl(
                        fileName
                    );

            const fileUrl =
                publicUrlData.publicUrl;

            // Save upload information
            // into the videos table
            const {
                data: video,
                error: databaseError
            } =
                await supabase
                    .from("videos")
                    .insert({
                        user_id: userId,
                        title: title,
                        description:
                            description,
                        category: category,
                        video_url: fileUrl,
                        thumbnail_url:
                            contentType === "image"
                                ? fileUrl
                                : null,
                        views: 0,
                        content_type:
                            contentType
                    })
                    .select()
                    .single();

            if (databaseError) {
                return res.status(500).json({
                    status: "error",
                    message:
                        databaseError.message
                });
            }

            // Everything succeeded
            res.json({
                status: "ok",
                message:
                    "Upload successful",
                video: video
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                status: "error",
                message:
                    error.message
            });
        }
    }
);

// Supabase connection test
app.get(
    "/api/supabase-test",
    async (req, res) => {

        try {

            const supabase =
                createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_ANON_KEY
                );

            const {
                error
            } =
                await supabase
                    .from("videos")
                    .select("id")
                    .limit(1);

            if (error) {
                return res.status(500).json({
                    status: "error",
                    message:
                        error.message
                });
            }

            res.json({
                status: "ok",
                message:
                    "Supabase database connection is working"
            });

        } catch (error) {

            res.status(500).json({
                status: "error",
                message:
                    error.message
            });
        }
    }
);

// Start server
const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `My Platform is running on port ${PORT}`
        );
    }
);
