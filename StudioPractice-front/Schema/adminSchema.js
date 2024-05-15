const mongoose = require("mongoose");

module.exports = (options = {}) => {
    return new mongoose.Schema(
        {
            username: { type: String, required: true, unique: true },
            password: { type: String, required: true }
        },
        options
    );
};
