const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`My Platform is running on port ${PORT}`);
});

