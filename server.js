require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});
const app = express();

app.use(express.json());

// Serve all files inside the public folder
app.use(express.static(path.join(__dirname, "public")));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// Backend health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "My Platform backend is running"
    });
});
// Video upload endpoint
app.post("/api/upload", upload.single("video"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "No video file selected"
            });
        }

        const { createClient } = require("@supabase/supabase-js");

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const fileName = `${Date.now()}-${req.file.originalname}`;

        const { error } = await supabase.storage
            .from("Videos")
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            return res.status(500).json({
                status: "error",
                message: error.message
            });
        }

        const { data } = supabase.storage
            .from("Videos")
            .getPublicUrl(fileName);

        res.json({
            status: "ok",
            message: "Video uploaded successfully",
            url: data.publicUrl
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});
// Supabase connection test
app.get("/api/supabase-test", async (req, res) => {

    try {

        const { createClient } =
            require("@supabase/supabase-js");

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const { error } =
            await supabase
                .from("videos")
                .select("id")
                .limit(1);

        if (error) {

            return res.status(500).json({
                status: "error",
                message: error.message
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
            message: error.message
        });

    }

});


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
