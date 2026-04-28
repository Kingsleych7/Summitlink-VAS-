// src/ussd/ussdController.js

const { getSession, saveSession } = require("../utils/session");
const { getRequestId } = require("../utils/idempotency");
const sendSMS = require("../services/sms");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");
const { getSession, saveSession, clearSession } = require("../utils/session");

module.exports = async (req, res) => {
    try {
        let { phoneNumber, text = "" } = req.body;

        text = (text || "").trim();

if (text === "") {
    return res.send("CON Enter your 4-digit PIN:");
}

        // ======================
        // LOAD SESSION
        // ======================
        let session = await getSession(phoneNumber) || {
            state: "PIN",
            data: {}
        };

        // ======================
        // IDEMPOTENCY
        // ======================
        const reqId = getRequestId(phoneNumber, text);

        if (session.lastReq === reqId) {
            return res.send("END Duplicate request");
        }

        session.lastReq = reqId;

        // ======================
        // GET USER
        // ======================
        let user = await User.findOne({ phoneNumber });

        if (!user) {
    const hashedPin = await bcrypt.hash("1234", 10);

    user = await User.create({
        phoneNumber: normalizedPhone,
        email: normalizedPhone + "@test.com",
        balance: 1000,
        pin: hashedPin
    });
}

        // ======================
        // BACK NAVIGATION
        // ======================
        if (text === "00") {
            session.state = "MENU";
            await saveSession(phoneNumber, session);

            return res.send(`CON Welcome back
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
        }

        // ======================
        // STATE MACHINE
        // ======================

        // PIN
        if (session.state === "PIN") {
    if (!text) {
        return res.send("CON Enter your 4-digit PIN:");
    }

    if (text !== user.pin) {
        return res.send("END ❌ Incorrect PIN");
    }

    session.state = "MAIN_MENU";
    saveSession(normalizedPhone, session);

    return res.send(`CON Welcome to SummitLink
1. Check Balance
2. Buy Airtime
3. Buy Data
4. Fund Wallet
5. Transactions`);
}

        // MENU
 if (session.state === "MAIN_MENU") {
       if (text === "1") {
    return res.send(`END Balance: ₦${user.balance}`);
}

if (text === "2") {
    session.state = "AIRTIME";
    saveSession(normalizedPhone, session);
    return res.send("CON Enter amount:");
}

if (text === "3") {
    session.state = "DATA";
    saveSession(normalizedPhone, session);
    return res.send("CON Select data plan");
}

if (text === "0") {
    session.state = "PIN";
    saveSession(normalizedPhone, session);
    return res.send("CON Enter PIN:");
}
            if (text === "4") {
                return res.send(`END 💳 Fund Wallet
https://your-backend.onrender.com/paystack/pay/${phoneNumber}/1000`);
            }

            if (text === "5") {
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
        }

        // AIRTIME
        if (session.state === "AIRTIME") {

    const amount = Number(text);

    if (!amount || amount <= 0) {
        return res.send("CON Enter valid amount:");
    }

    if (user.balance < amount) {
        return res.send("END ❌ Insufficient balance");
    }

    user.balance -= amount;
    await user.save();

    session.state = "MAIN_MENU";
    saveSession(normalizedPhone, session);

    return res.send("END ✅ Airtime successful");
}

        // DATA
        if (session.state === "DATA") {

            const option = text;

            let amount = 0;
            let plan = "";

            if (option === "1") { amount = 300; plan = "1GB"; }
            if (option === "2") { amount = 500; plan = "2GB"; }
            if (option === "3") { amount = 1200; plan = "5GB"; }

            if (user.balance < amount) {
                return res.send("END ❌ Insufficient balance");
            }

            user.balance -= amount;
            await user.save();

            await Transaction.create({
                phoneNumber,
                type: "DEBIT",
                amount,
                description: plan
            });

            await sendSMS(phoneNumber, `${plan} purchased`);

            session.state = "PIN";
            await saveSession(phoneNumber, session);

            return res.send(`END ✅ ${plan} successful`);
        }

        return res.send("END Invalid");

    } catch (err) {
        console.log("USSD ERROR:", err);
        return res.send("END System error");
    }
};
