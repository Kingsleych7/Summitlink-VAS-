const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");

app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // REQUIRED for Paystack webhook

// 🔗 CONNECT MONGODB
mongoose.connect("mongodb+srv://testuser:testpass123@cluster0.xt2kxhu.mongodb.net/testdb?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("DB ERROR:", err)); 

// 👤 USER MODEL
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    balance: { type: Number, default: 1000 }
});
const User = mongoose.model("User", UserSchema);

// 🌐 TEST ROUTE
app.post("/ussd", async (req, res) => {
    try {
        let { text = "", phoneNumber = "" } = req.body;
        text = text.trim();

        let user = await User.findOne({ phoneNumber });

        if (!user) {
            user = await User.create({
                phoneNumber,
                email: phoneNumber + "@test.com",
                balance: 1000
            });
        }

        let response = "";

        // MAIN MENU
        if (text === "") {
            response = "CON Welcome to SummitLink\n1. My Account\n2. Buy Data\n3. Fund Wallet\n4. Register";
        }

        // ACCOUNT
        else if (text === "1") {
            response = "CON My Account\n1. Check Balance";
        }

        else if (text === "1*1") {
            response = `END Your balance is ₦${user.balance}`;
        }

        // REGISTER
        else if (text === "4") {
            response = "CON Enter your email address";
        }

        else if (text.startsWith("4*")) {
            const email = text.split("*")[1];

            user.email = email;
            await user.save();

            response = "END Registration successful";
        }

        // BUY DATA MENU
        else if (text === "2") {
            response = "CON Buy Data\n1. 1GB - ₦300\n2. 2GB - ₦500\n3. 3GB - ₦800\n4. 5GB - ₦1200";
        }

        else if (text === "2*1" && user.balance >= 300) {
            user.balance -= 300;
            await user.save();
            response = "END You bought 1GB";
        }

        else if (text === "2*2" && user.balance >= 500) {
            user.balance -= 500;
            await user.save();
            response = "END You bought 2GB";
        }

        else if (text === "2*3" && user.balance >= 800) {
            user.balance -= 800;
            await user.save();
            response = "END You bought 3GB";
        }

        else if (text === "2*4" && user.balance >= 1200) {
            user.balance -= 1200;
            await user.save();
            response = "END You bought 5GB";
        }

        // FUND WALLET (PAYSTACK LINK)
        else if (text === "3") {
            response = "END Fund your wallet here: https://paystack.shop/pay/thax9-8kli";
        }

        else {
            response = "END Invalid input";
        }

        res.send(response);

    } catch (err) {
        console.log("USSD ERROR:", err);
        res.send("END System error");
    }
});
 

app.get("/paystack/pay/:phone/:amount", async (req, res) => {
    try {
        const { phone, amount } = req.params;

        let user = await User.findOne({ phoneNumber: phone });

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: user.email,
                amount: amount * 100, // kobo
                callback_url: "https://your-backend.com/paystack/verify"
            },
            {
                headers: {
                    Authorization: `Bearer YOUR_SECRET_KEY`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.redirect(response.data.data.authorization_url);

    } catch (err) {
        console.log(err);
        res.send("Payment error");
    }
});

app.post("/paystack-webhook", async (req, res) => {
    try {
        const event = req.body;

        if (event.event === "charge.success") {
            const email = event.data.customer.email;
            const amount = event.data.amount / 100;

            let user = await User.findOne({ email });

            if (user) {
                user.balance += amount;
                await user.save();
                console.log("Wallet credited:", amount);
            }
        }

        res.sendStatus(200);

    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

// 🚀 SERVER
const PORT = process.env.PORT || 3000;
app.listen(10000, () => {
    console.log("Server running on port 10000");
});