const mongoose = require("mongoose");

module.exports = (uris, options = {}) => {
    const connections = {};

    uris.forEach((uri, index) => {
        const db = mongoose.createConnection(uri, options);

        db.set('strictQuery', true);

        db.once('open', () => console.info(`MongoDB connection ${index + 1} opened!`));
        db.on('connected', () => console.info(`MongoDB connection ${index + 1} succeeded!`));
        db.on('error', err => {
            console.error(`MongoDB connection ${index + 1} error: ${err}`);
            db.close();
        });
        db.on('disconnected', () => console.info(`MongoDB connection ${index + 1} disconnected!`));

        process.on('SIGINT', async () => {
            try {
                await db.close();
                console.info(`Mongoose connection ${index + 1} disconnected through app termination!`);
                process.exit(0);
            } catch (error) {
                console.error(`Error during connection ${index + 1} disconnection: ${error}`);
                process.exit(1);
            }
        });

        connections[`db${index + 1}`] = db;
    });

    return connections;
};
