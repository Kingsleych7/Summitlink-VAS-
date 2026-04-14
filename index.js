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
    balance: { type: Number, default: 0 },

    // NEW
    session: { type: String, default: "" }
});

const TransactionSchema = new mongoose.Schema({
    phoneNumber: String,
    type: String, // credit / debit
    amount: Number,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

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
                balance: 0
            });
        }

        let response = "";

        // ======================
        // MAIN MENU
        // ======================
        if (text === "") {
            response =
`CON Welcome to SummitLink Wallet
1. Check Balance
2. Buy Data
3. Fund Wallet
4. Transaction History`;
        }

        // ======================
        // CHECK BALANCE
        // ======================
        else if (text === "1") {
            response = `END Your balance is ₦${user.balance}`;
        }

        // ======================
        // TRANSACTION HISTORY
        // ======================
        else if (text === "4") {
            const tx = await Transaction.find({ phoneNumber }).sort({ createdAt: -1 }).limit(5);

            if (tx.length === 0) {
                response = "END No transactions yet";
            } else {
                let history = tx.map(t =>
                    `${t.type.toUpperCase()} ₦${t.amount} - ${t.description}`
                ).join("\n");

                response = `END Recent Transactions:\n${history}`;
            }
        }

        // ======================
        // FUND WALLET FLOW (STATE 1)
        // ======================
        else if (text === "3") {
            response = "CON Enter amount to fund:";
        }

        // USER ENTERED AMOUNT
        else if (text.startsWith("3*")) {
            const amount = text.split("*")[1];

            const payLink = `https://your-domain.com/paystack/pay/${phoneNumber}/${amount}`;

            response = `END Pay here:\n${payLink}`;
        }

        res.send(response);

    } catch (err) {
        console.log(err);
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