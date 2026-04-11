8const express = require("express");
const app = express();
const mongoose = require("mongoose");

app.use(express.urlencoded({ extended: false }));

// 🔗 CONNECT TO MONGODB
mongoose.connect("mongodb+srv://Summitlink:summit9876@summitlinkcluster.t4qvdqt.mongodb.net/?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// 👤 USER MODEL
const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    balance: { type: Number, default: 1000 }
});
const User = mongoose.model("User", UserSchema);

// 🌐 TEST ROUTE
app.get("/", (req, res) => {
    res.send("SummitLink USSD + DB LIVE 🚀");
});

// 📡 USSD ROUTE
app.post("/ussd", async (req, res) => {
    try {
        console.log(req.body);

        let { text = "", phoneNumber = "" } = req.body || {};
        text = text.trim();

        let response = "";

        let user = await User.findOne({ phoneNumber });

        if (!user) {
            user = await User.create({ phoneNumber, balance: 1000 });
        }

        
    // 🏠 MAIN MENU
    if (text === "") {
        response = "CON Welcome to SummitLink\n1. My Account\n2. Buy Data\n3. Support";
    }

    // 👤 ACCOUNT
    else if (text === "1") {
        response = "CON My Account\n1. Check Balance\n2. Wallet Info";
    }
    else if (text === "1*1") {
        response = `END Your balance is ₦${user.balance}`;
    }
    else if (text === "1*2") {
        response = "END Wallet is active";
    }

    // 📡 DATA MENU (UPDATED)
    else if (text === "2") {
        response =
`CON Buy Data
1. 1GB - ₦300
2. 2GB - ₦500
3. 3GB - ₦800
4. 5GB - ₦1200`;
    }

    // 📶 BUY 1GB
    else if (text === "2*1") {
        if (user.balance >= 300) {
            user.balance -= 300;
            await user.save();
            response = "END You bought 1GB for ₦300";
        } else {
            response = "END Insufficient balance";
        }
    }

    // 📶 BUY 2GB
    else if (text === "2*2") {
        if (user.balance >= 500) {
            user.balance -= 500;
            await user.save();
            response = "END You bought 2GB for ₦500";
        } else {
            response = "END Insufficient balance";
        }
    }

    // 📶 BUY 3GB
    else if (text === "2*3") {
        if (user.balance >= 800) {
            user.balance -= 800;
            await user.save();
            response = "END You bought 3GB for ₦800";
        } else {
            response = "END Insufficient balance";
        }
    }

    // 📶 BUY 5GB
    else if (text === "2*4") {
        if (user.balance >= 1200) {
            user.balance -= 1200;
            await user.save();
            response = "END You bought 5GB for ₦1200";
        } else {
            response = "END Insufficient balance";
        }
    }

    // 📞 SUPPORT
    else if (text === "3") {
        response = "END Contact: support@summitlink.ng";
    }

    // ❌ INVALID
    else {
        response = "END Invalid input";
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(response);
});

// 🚀 SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});