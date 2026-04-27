const Session = require("../models/Session");

// GET SESSION
async function getSession(phone) {
    let session = await Session.findOne({ phone });

    if (!session) {
        session = await Session.create({
            phone,
            data: {}
        });
    }

    return session.data;
}

// SAVE SESSION
async function saveSession(phone, data) {
    await Session.findOneAndUpdate(
        { phone },
        { data },
        { upsert: true, new: true }
    );
}

module.exports = {
    getSession,
    saveSession
};
