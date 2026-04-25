require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;

const africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// =======================
// PHONE NORMALIZER
// =======================
function normalizePhone(phone) {
    phone = phone.trim();
    if (phone.startsWith("0")) return "+234" + phone.slice(1);
    return phone;
}

// =======================
// MOCK FUNCTIONS
// =======================
async function buyAirtime(phone, amount) {
    try {
        const result = await africastalking.AIRTIME.send({
            recipients: [
                {
                    phoneNumber: phone,
                    amount: `NGN ${amount}`
                }
            ]
        });

        console.log("Airtime sent:", result);
        return true;

    } catch (err) {
        console.log("Airtime error:", err);
        return false;
    }
}

async function sendSMS(phone, message) {
    try {
        await africastalking.SMS.send({
            to: phone,
            message
        });

        console.log("SMS sent");
    } catch (err) {
        console.log("SMS error:", err);
    }
}

async function buyData(phone, plan) {
    return true;
}

// =======================
// MONGODB
// =======================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => {
    console.log("DB ERROR:", err);
    process.exit(1);
});

// =======================
// USER MODEL
// =======================
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true },
    email: String,
    balance: { type: Number, default: 0 },
    pin: { type: String, default: "1234" }
});

const User = mongoose.model("User", UserSchema);

// =======================
// TRANSACTION MODEL
// =======================
const TransactionSchema = new mongoose.Schema({
    phoneNumber: String,
    type: String,
    amount: Number,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

// =======================
// USSD ROUTE
// =======================
app.post("/ussd", async (req, res) => {
    try {
        const {
            sessionId,
            serviceCode,
            phoneNumber,
            text = ""
        } = req.body;

        let userInput = text.trim();
        const normalizedPhone = normalizePhone(phoneNumber);
       
       // 👇 PUT NAVIGATION HANDLER HERE
        const input = text;

        if (input === "0") {
            const parts = text.split("*");
            parts.pop();
            const newText = parts.join("*");

            if (newText === "") {
                return res.send(`CON Welcome back
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
            }

            text = newText;
        }

        let user = await User.findOne({ phoneNumber: normalizedPhone });

        if (!user) {
            user = await User.create({
                phoneNumber: normalizedPhone,
                email: normalizedPhone + "@test.com",
                balance: 1000,
                pin: "1234"
            });
        }

        // FIRST SCREEN
        if (userInput === "") {
            return res.send("CON Enter your 4-digit PIN:");
        }

        // PIN CHECK
        if (!userInput.includes("*") && userInput.length === 4) {
            if (userInput !== user.pin) {
                return res.send("END ❌ Incorrect PIN");
            }

            return res.send(`CON Welcome to SummitLink
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
        }

        // =======================
        // MENU ROUTING
        // =======================

        // BALANCE
        if (text === user.pin + "*1") {
            return res.send(`END Balance: ₦${user.balance}`);
        }

        // AIRTIME
        if (text === user.pin + "*2") {
    return res.send("CON Enter amount:\n0. Back\n00. Main Menu");
}

        if (text.startsWith(user.pin + "*2*")) {
            const amount = Number(text.split("*")[2]);
     const parts = text.split("*");
// BACK pressed after entering amount
if (parts[3] === "0") {
    return res.send(`CON Welcome back
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
}
            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "DEBIT",
                amount,
                description: "Airtime purchase"
            });
              
     // ✅ SEND SMS HERE
     await sendSMS(
        user.phoneNumber,
        `₦${amount} airtime sent successfully`
    );

            return res.send("END ✅ Airtime sent");
        }

        // DATA MENU
        if (text === user.pin + "*3") {
            return res.send(`CON Select Data Plan
1. 1GB - ₦300
2. 2GB - ₦500
3. 5GB - ₦1200`);
        }

        if (text.startsWith(user.pin + "*3*")) {
            const option = text.split("*")[2];
const parts = text.split("*");
// BACK pressed after entering amount
if (parts[3] === "0") {
    return res.send(`CON Welcome back
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
}
            let amount = 0;
            let plan = "";

            if (option === "1") { amount = 300; plan = "1GB"; }
            if (option === "2") { amount = 500; plan = "2GB"; }
            if (option === "3") { amount = 1200; plan = "5GB"; }

            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            await buyData(user.phoneNumber, plan);

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "DEBIT",
                amount,
                description: `${plan} data`
            });
         
 await sendSMS(
    user.phoneNumber,
    `${plan} data purchased successfully`
);

            return res.send(`END ✅ Data Successful\nPlan: ${plan}`);
        }

        // FUND WALLET
        if (text === user.pin + "*4") {
            const link = `https://summitlink-backend.onrender.com/paystack/pay/${phoneNumber}/1000`;

            return res.send(`END 💳 Fund Wallet\n${link}`);
        }

        // TRANSACTIONS
        if (text === user.pin + "*5") {

    const txs = await Transaction.find({ phoneNumber })
        .sort({ createdAt: -1 })
        .limit(3);

    if (!txs.length) {
        return res.send("END No transactions");
    }

    let msg = "END Recent Transactions:\n";

    txs.forEach(t => {
        msg += `${t.type} ₦${t.amount}\n`;
    });

    return res.send(msg);
}
      
        return res.send("END Invalid request");

    } catch (err) {
        console.log("USSD ERROR:", err);
        return res.send("END System error");
    }
});

// =======================
// PAYSTACK INIT
// =======================
app.get("/paystack/pay/:phone/:amount", async (req, res) => {
    try {
        const { phone, amount } = req.params;

        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({ phoneNumber: normalizedPhone });

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: user.email,
                amount: amount * 100,
                metadata: { phoneNumber: normalizedPhone },
                callback_url: "https://your-backend.com/paystack/webhook"
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.redirect(response.data.data.authorization_url);

    } catch (err) {
        console.log(err);
        res.send("Payment error");
    }
});

// =======================
// PAYSTACK WEBHOOK
// =======================
app.post("/paystack/webhook", async (req, res) => {
    try {
        const hash = crypto
            .createHmac("sha512", process.env.PAYSTACK_SECRET)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            return res.sendStatus(401);
        }

        const event = req.body;

        if (event.event === "charge.success") {
            const data = event.data;

            const phoneNumber = data.metadata.phoneNumber;
            const amount = data.amount / 100;

            const user = await User.findOne({ phoneNumber });
            if (!user) return res.sendStatus(200);

            user.balance += amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "CREDIT",
                amount,
                description: "Wallet funding"
            });

            console.log("💰 Funded:", phoneNumber, amount);
        }

        res.sendStatus(200);

    } catch (err) {
        console.log("WEBHOOK ERROR:", err);
        res.sendStatus(500);
    }
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});