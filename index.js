require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const ussdController = require("./src/ussd/ussdController");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/ussd", ussdController);

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB connected"))
.catch(err => console.log("DB error:", err));

app.listen(process.env.PORT || 10000, () => {
    console.log("Server running");
});
