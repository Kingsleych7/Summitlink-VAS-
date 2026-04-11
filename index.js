// 1. IMPORTS
const express = require("express");
const app = express();
const mongoose = require("mongoose");

// 2. BODY PARSER
app.use(express.urlencoded({ extended: false }));

// 3. MONGODB CONNECT (KEEP THIS)
mongoose.connect("mongodb+srv://Summitlink:summit9876@summitlinkcluster.t4qvdqt.mongodb.net/?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// 4. USER MODEL
const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    balance: { type: Number, default: 1000 }
});

const User = mongoose.model("User", UserSchema);

// 5. ROUTES
app.get("/", (req, res) => {
    res.send("USSD service is running 🚀");
});

// 6. USSD ROUTE (FIXED LOGIC GOES HERE)
app.post("/ussd", async (req, res) => {
    const { text = "", phoneNumber } = req.body;

    let response = "";

    let user = await User.findOne({ phoneNumber });

    if (!user) {
        user = await User.create({
            phoneNumber,
            balance: 1000
        });
    }

    if (text === "") {
        response = "CON Welcome to SummitLink\n1. My Account\n2. Buy Data\n3. Support";
    }

    else if (text === "1*1") {
        response = `END Your balance is ₦${user.balance}`;
    }

    else if (text === "2*1") {
        if (user.balance >= 300) {
            user.balance -= 300;
            await user.save();
            response = "END You bought 1GB for ₦300";
        } else {
            response = "END Insufficient balance";
        }
    }

    else {
        response = "END Invalid input";
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(response);
});

// 7. SERVER START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("USSD running"));