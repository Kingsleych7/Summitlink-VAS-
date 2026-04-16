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
    email: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },

    session: { type: String, default: "" },

    // 🔐 NEW
    pin: { type: String, default: "1234" }
});

const TransactionSchema = new mongoose.Schema({
  
// 🌐 TEST ROUTE
app.post("/ussd", async (req, res) => {
    try {
        let { text = "", phoneNumber = "" } = req.body;
        text = text.trim();

        phoneNumber = normalizePhone(phoneNumber);
let user = await User.findOne({ phoneNumber });

        if (!user) {
            user = await User.create({
                phoneNumber,
                email: phoneNumber + "@test.com",
                balance: 0
            });
        }

        let response = "";
if (text.length === 4 && !text.includes("*")) {

    if (text !== user.pin) {
        return res.send("END Incorrect PIN");
    }

    return res.send(
`CON Welcome Back
1. Check Balance
2. Buy Airtime
3. Buy Data
4. 4. Fund Wallet (Paystack)
5. Transaction History`
    );
}
        // ======================
        // MAIN MENU
        // ======================
        if (text === "") {
    response = `CON SummitLink VTU
Enter your PIN:`;
}
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet`;
        }

        // ======================
        // BALANCE
        // ======================
        else if (text === "1") {
            response = `END Balance: ₦${user.balance}`;
        }

        // ======================
        // AIRTIME FLOW
        // ======================
        else if (text === "2") {
            response = "CON Enter amount for airtime:";
        }

        else if (text.startsWith("2*")) {
            const amount = parseInt(text.split("*")[1]);

            if (user.balance < amount) {
                return res.send("END Insufficient balance");
            }

            const result = await buyAirtime(user.phoneNumber, amount);

            if (!result) {
                return res.send("END Airtime purchase failed");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "debit",
                amount,
                description: "Airtime purchase"
            });

            response = `END SUCCESS
Airtime: ₦${amount}
Phone: ${user.phoneNumber}
Balance: ₦${user.balance}`;

        // ======================
        // DATA FLOW
        // ======================
        else if (text === "3") {
            response =
`CON Select Data Plan
1. 1GB - ₦300
2. 2GB - ₦500
3. 5GB - ₦1200`;
        }

        else if (text.startsWith("3*")) {
            const option = text.split("*")[1];

            let amount = 0;
            let plan = "";

            if (option === "1") {
                amount = 300;
                plan = "1GB";
            }
            if (option === "2") {
                amount = 500;
                plan = "2GB";
            }
            if (option === "3") {
                amount = 1200;
                plan = "5GB";
            }
else if (text === "5") {

    const txns = await Transaction.find({ phoneNumber })
        .sort({ createdAt: -1 })
        .limit(5);

    if (txns.length === 0) {
        return res.send("END No transactions found");
    }

    let responseText = "END Last 5 Transactions:\n";

    txns.forEach(t => {
        responseText += `${t.type.toUpperCase()} ₦${t.amount} - ${t.description}\n`;
    });

    return res.send(responseText);
}
         if (user.balance < amount) {
 
                return res.send("END Insufficient balance");
            }

            const result = await buyData(user.phoneNumber, plan);

            if (!result) {
                return res.send("END Data purchase failed");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "debit",
                amount,
                description: `${plan} data purchase`
            });

            response = `END You bought ${plan} successfully`;
        }

        // ======================
        // FUND WALLET
        // ======================
        else if (text === "4") {
            const link = `http://127.0.0.1:10000/paystack/pay/${phoneNumber}/1000`;
            response = `END Fund wallet:\n${link}`;
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