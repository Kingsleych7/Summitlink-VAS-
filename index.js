require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;

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
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => {
    console.log("DB ERROR:", err);
    process.exit(1);
});

// =======================
// 👤 USER MODEL
// =======================
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: "" },
    balance: { type: Number, default: 0 },
    pin: { type: String, default: "1234" }
});

const User = mongoose.model("User", UserSchema);


// =======================
// 💰 TRANSACTION MODEL
// =======================
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
        phoneNumber = normalizePhone(phoneNumber);

        let user = await User.findOne({ phoneNumber });

        if (!user) {
            user = await User.create({
                phoneNumber,
                email: phoneNumber + "@test.com",
                balance: 1000,
                pin: "1234"
            });
        }

        // ======================
        // STEP 1: ASK PIN
        // ======================
        if (text === "") {
            return res.send("CON Enter your 4-digit PIN:");
        }

        // ======================
        // STEP 2: VERIFY PIN
        // ======================
        else if (text.length === 4 && !text.includes("*")) {
            if (text !== user.pin) {
                return res.send("END ❌ Incorrect PIN");
            }

            return res.send(`CON Welcome to SummitLink
1. Check Balance
2. Buy Airtime
3. Buy Data`
            );
        }

        // ======================
        // BALANCE
        // ======================
         if (text === user.pin + "*1") {
            return res.send(`END Balance: ₦${user.balance}`);
        }
           
        // STEP 4: AIRTIME
        else if (text === user.pin + "*2") {
            return res.send("CON Enter amount:");
        }

        else if (text.startsWith(user.pin + "*2*")) {
            const amount = Number(text.split("*")[2]);

            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            user.balance -= amount;
            await user.save();

            return res.send("END ✅ Airtime sent");
        }

        // ======================
        // DATA MENU
        // ======================
        if (text === user.pin + "*3") {
            return res.send(`CON Select Data Plan
1. 1GB - ₦300
2. 2GB - ₦500
3. 5GB - ₦1200`);
        }

        // ======================
        // DATA PURCHASE
        // ======================
  if (text.startsWith(user.pin + "*3*")) {
            const option = text.split("*")[2];

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

            return res.send(`END ✅ Data Successful
Plan: ${plan}
Balance: ₦${user.balance}`);
        }

  // ======================
// FUND WALLET
// ======================
// FUND WALLET ✅ FIXED
   if (text === user.pin + "*4") {
            const link = `https://summitlink-vas-1.onrender.com/paystack/pay/${phoneNumber}/1000`;

            return res.send(
`END 💳 Fund Wallet
${link}`
            );
        }
     
  // ======================
// TRANSACTION HISTORY
// ======================
if (text === user.pin + "*5") {

    const transactions = await Transaction
  .find({ phoneNumber })
  .sort({ createdAt: -1 })
  .limit(3)
  .lean();

    if (transactions.length === 0) {
        return res.send("END No transactions yet");
    }

    let message = "END Recent Transactions:\n";

    transactions.forEach(tx => {
        message += `${tx.type} ₦${tx.amount}\n`;
    });

    return res.send(message);
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

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: user.email,
                amount: amount * 100,
                metadata: {
                    phoneNumber: normalizedPhone
                },
                callback_url: "https://your-backend.com/paystack/verify"
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
        console.error(err);
        res.send("Payment error");
    }
});

app.post("/paystack/webhook", express.json(), async (req, res) => {
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
      phone: phoneNumber,
      type: "FUNDING",
      amount,
      reference: data.reference
    });

    console.log("💰 Payment confirmed:", phoneNumber, amount);
  }

  res.sendStatus(200);
});

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