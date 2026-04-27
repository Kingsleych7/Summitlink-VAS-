const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    data: { type: Object, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Session", SessionSchema);
