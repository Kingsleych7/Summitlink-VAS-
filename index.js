require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const ussdController = require("./src/ussd/ussdController");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// USSD route
app.post("/ussd", ussdController);

// DB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB connected"))
.catch(err => console.log("DB error:", err));

// Start server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});