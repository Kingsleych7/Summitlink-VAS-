const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true },
    email: String,
    balance: { type: Number, default: 0 },
    pin: String // can now store hashed PIN
});

module.exports = mongoose.model("User", UserSchema);
