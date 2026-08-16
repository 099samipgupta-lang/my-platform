const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.listen(3000, "127.0.0.1", () => {
    console.log("My Platform is running on port 3000");
});

