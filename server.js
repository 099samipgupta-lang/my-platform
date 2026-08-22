require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();


// =========================
// SUPABASE
// =========================

if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is missing from .env");
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is missing from .env");
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);


// =========================
// MULTER
// =========================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 500 * 1024 * 1024
    }
});


// =========================
// EXPRESS
// =========================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// =========================
// HOMEPAGE
// =========================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {

    res.json({
        status: "ok",
        message: "My Platform backend is running"
    });

});


// =========================
// UPLOAD
// =========================

app.post(
    "/api/upload",
    upload.single("video"),

    async (req, res) => {

        try {

            // Check file
            if (!req.file) {

                return res.status(400).json({
                    status: "error",
                    message:
                        "No video or image selected"
                });

            }


            // Check authorization
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
console.log("UPLOAD REQUEST RECEIVED");
console.log("TOKEN RECEIVED:", !!accessToken);

            // Create client using
            // logged-in user's token
            const userSupabase =
                createClient(
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


            // Verify user
            const {
                data: userData,
                error: userError
            } =
                await userSupabase.auth.getUser(
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
                console.log("UPLOAD USER ID:", userId);

            // Get upload information
            const title =
                req.body.title ||
                req.file.originalname;

            const description =
                req.body.description ||
                "";

            const category =
                req.body.category ||
                "Other";


            // Detect image/video
            const contentType =
                req.file.mimetype.startsWith("image/")
                    ? "image"
                    : "video";


            // Unique file name
            const fileName =
                `${userId}/${Date.now()}-${req.file.originalname}`;


            // Upload to Storage
            const {
                error: uploadError
            } =
                await userSupabase.storage
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

                console.error(
                    "Storage error:",
                    uploadError
                );

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
                userSupabase.storage
                    .from("Videos")
                    .getPublicUrl(
                        fileName
                    );


            const fileUrl =
                publicUrlData.publicUrl;


            // Save information
            // into videos table
            const {
                data: video,
                error: databaseError
            } =
                await userSupabase
                    .from("videos")
                    .insert({

                        user_id:
                            userId,

                        title:
                            title,

                        description:
                            description,

                        category:
                            category,

                        video_url:
                            fileUrl,

                        thumbnail_url:
                            contentType === "image"
                                ? fileUrl
                                : null,

                        views:
                            0,

                        content_type:
                            contentType

                    })
                    .select()
                    .single();


            if (databaseError) {

                console.error(
                    "Database insert  error:",
                    databaseError
                );
                console.error("USER ID USED FOR INSERT:", userId);
                return res.status(500).json({
                    status: "error",
                    message:
                        databaseError.message
                });

            }


            // SUCCESS
            res.json({

                status: "ok",

                message:
                    "Upload successful",

                video:
                    video

            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            res.status(500).json({

                status: "error",

                message:
                    error.message

            });

        }

    }
);


// =========================
// SUPABASE TEST
// =========================

app.get(
    "/api/supabase-test",

    async (req, res) => {

        try {

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


// =========================
// START SERVER
// =========================

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
