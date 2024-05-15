const mongoose = require("mongoose");

module.exports = (options = {}) => {
    return new mongoose.Schema(
        {
            name: String,
            desc: String,
            url: String,
            img:
                {
                    data: Buffer,
                    contentType: String
                }
        },
        options
    );
}
