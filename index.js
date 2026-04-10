const express = require("express");
const app = express();
const mongoose = require("mongoose");
// Parse USSD data (VERY IMPORTANT)
app.use(express.urlencoded({ extended: false }));

// =========================
// AFRICA'S TALKING SETUP
// =========================
// ONLY needed if you later use SMS / Airtime / Data API
const AfricasTalking = require("africastalking")({
    username: "sandbox",
    apiKey: "atsk_a281402b86f3cb842c15c96c41272554b8920fe5c3b260c14a02f46ee33b934e9f1c1de0"
});
mongoose.connect("mongodb+srv://Summitlink:<summit9876>@summitlinkcluster.t4qvdqt.mongodb.net/")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));
const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    balance: { type: Number, default: 1000 }
});

const User = mongoose.model("User", UserSchema);
// =========================
// TEST ROUTE (CHECK IF SERVER IS LIVE)
// =========================
app.get("/", (req, res) => {
    res.send("USSD service is running 🚀");
});

// =========================
// USSD ROUTE (MAIN MENU)
// =========================
app.post("/ussd", async (req, res) => {
    const { const { text = "", phoneNumber } = req.body;

    let response = "";
let user = await User.findOne({ phoneNumber });

if (!user) {
    user = await User.create({
        phoneNumber,
        balance: 1000
    });
}
    // MAIN MENU
    if (text === "") {
        response = "CON Welcome to SummitLink\n1. My Account\n2. Buy Data\n3. Support";
    }

    // MY ACCOUNT
    else if (text === "1") {
        response = "CON My Account\n1. Check Balance\n2. Wallet Info";
    }
    else if (text === "1*1") {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
        response = "END User not found";
    } else {
        response = `END Your balance is ₦${user.balance}`;
}if (text === "") {
    response = "CON Welcome to SummitLink\n1. My Account\n2. Buy Data\n3. Support";
}

else if (text === "1") {
    response = "CON My Account\n1. Check Balance\n2. Wallet Info";
}

// 👇 PUT IT RIGHT HERE
else if (text === "1*1") {
    response = `END Your balance is ₦${user.balance}`;
}
    }
    else if (text === "1*2") {
        response = "END Wallet active";
    }

    // BUY DATA
    else if (text === "2") {
        response = "CON Buy Data\n1. 1GB - ₦300\n2. 2GB - ₦500";
    }
    else if (text === "2*1") {
        response = "END You bought 1GB for ₦300";
    }
    else if (text === "2*2") {
        response = "END You bought 2GB for ₦500";
    }

    // SUPPORT
    else if (text === "3") {
        response = "END Contact: support@summitlink.ng";
    }

    // INVALID INPUT
    else {
        response = "END Invalid input";
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(response);
});

// =========================
// START SERVER (RENDER USES THIS)
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("USSD server running on port " + PORT);
});