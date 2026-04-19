const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");

app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // REQUIRED for Paystack webhook

function normalizePhone(phone) {
    phone = phone.trim();

    if (phone.startsWith("0")) {
        return "+234" + phone.slice(1);
    }

    return phone;
}
async function buyAirtime(phone, amount) {
    return true;
}

async function buyData(phone, plan) {
    return true;
}

// 🔗 CONNECT MONGODB
mongoose.connect("mongodb+srv://testuser:testpass123@cluster0.xt2kxhu.mongodb.net/testdb?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("DB ERROR:", err)); 

// 👤 USER MODEL
const TransactionSchema = new mongoose.Schema({
    phoneNumber: String,
    type: String, // credit / debit
    amount: Number,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },

    session: { type: String, default: "" },

    // 🔐 NEW
    pin: { type: String, default: "1234" }
});

const TransactionSchema = new mongoose.Schema({
  
if (!phoneNumber) {
  return res.send("END Missing phone number");
}

// 🌐 TEST ROUTE
app.post("/ussd", async (req, res) => {
    try {
        let { text = "", phoneNumber = "" } = req.body;

        text = text.trim();
        phoneNumber = normalizePhone(phoneNumber);

        // ======================
        // GET OR CREATE USER
        // ======================
        let user = await User.findOne({ phoneNumber });

        if (!user) {
            user = await User.create({
                phoneNumber,
                email: phoneNumber + "@test.com",
                balance: 0,
                pin: "1234" // default PIN (temporary)
            });
        }

        let response = "";

        // ======================
        // STEP 1: PIN AUTH
        // ======================
        if (text.length === 4 && !text.includes("*")) {

            if (text !== user.pin) {
                return res.send("END ❌ Incorrect PIN");
            }

            return res.send(
`CON Welcome to SummitLink VTU
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transaction History`
            );
        }

        // ======================
        // MAIN MENU
        // ======================
        if (text === "") {
            return res.send("CON Enter your 4-digit PIN:");
        }

        // ======================
        // CHECK BALANCE
        // ======================
        if (text === "1") {
            return res.send(`END Balance: ₦${user.balance}`);
        }

        // ======================
        // AIRTIME FLOW
        // ======================
        if (text === "2") {
            return res.send("CON Enter airtime amount:");
        }

        if (text.startsWith("2*")) {
            const amount = Number(text.split("*")[1]);

            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            const result = await buyAirtime(user.phoneNumber, amount);

            if (!result) {
                return res.send("END ❌ Airtime failed");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "debit",
                amount,
                description: "Airtime purchase"
            });

            return res.send(
`END ✅ Airtime Successful
Amount: ₦${amount}
Balance: ₦${user.balance}`
            );
        }

        // ======================
        // DATA FLOW
        // ======================
        if (text === "3") {
            return res.send(
`CON Select Data Plan
1. 1GB - ₦300
2. 2GB - ₦500
3. 5GB - ₦1200`
            );
        }

        if (text.startsWith("3*")) {
            const option = text.split("*")[1];

            let amount = 0;
            let plan = "";

            if (option === "1") {
                amount = 300;
                plan = "1GB";
            } else if (option === "2") {
                amount = 500;
                plan = "2GB";
            } else if (option === "3") {
                amount = 1200;
                plan = "5GB";
            }

            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            const result = await buyData(user.phoneNumber, plan);

            if (!result) {
                return res.send("END ❌ Data purchase failed");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "debit",
                amount,
                description: `${plan} data purchase`
            });

            return res.send(
`END ✅ Data Successful
Plan: ${plan}
Balance: ₦${user.balance}`
            );
        }

        // ======================
        // FUND WALLET
        // ======================
        if (text === "4") {
            const link = `http://127.0.0.1:10000/paystack/pay/${phoneNumber}/1000`;

            return res.send(
`END 💳 Fund Wallet
Click link:
${link}`
            );
        }

        // ======================
        // TRANSACTION HISTORY
        // ======================
        if (text === "5") {

            const txns = await Transaction.find({ phoneNumber })
                .sort({ createdAt: -1 })
                .limit(5);

            if (!txns.length) {
                return res.send("END No transactions found");
            }

            let output = "END Last 5 Transactions:\n";

            txns.forEach(t => {
                output += `${t.type.toUpperCase()} ₦${t.amount} - ${t.description}\n`;
            });

            return res.send(output);
        }

        // ======================
        // DEFAULT FALLBACK
        // ======================
        return res.send("END Invalid request");

    } catch (err) {
  console.error("🔥 FULL ERROR:", err);
  return res.send("END System error, try again");
  }
});
  
app.get("/paystack/pay/:phone/:amount", async (req, res) => {
    try {
        const { phone, amount } = req.params;

const normalizedPhone = normalizePhone(phone);
let user = await User.findOne({ phoneNumber: normalizedPhone });

            "https://api.paystack.co/transaction/initialize",
            {
                email: user.email,
                amount: amount * 100,
                callback_url: "https://your-backend.com/paystack/verify"
            },
            {
                headers: {
                    process.env.PAYSTACK_SECRET
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

                // 🔥 LOG TRANSACTION
                await Transaction.create({
                    phoneNumber: user.phoneNumber,
                    type: "credit",
                    amount,
                    description: "Wallet funding via Paystack"
                });

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
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});