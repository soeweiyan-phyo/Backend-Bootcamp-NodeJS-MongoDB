const dotenv = require("dotenv");
const mongoose = require("mongoose");

/* Handle all uncaught exceptions. */
/* Must be written before any before any code runs. */
process.on("uncaughtException", err => {
  console.log(err.name, err.message);
  console.log(err);
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

/* Replace <PASSWORD> in the DB link with DB password. */
const DB_PASSWORD = process.env.DATABASE_PASSWORD;
const DB = process.env.DATABASE.replace("<PASSWORD>", DB_PASSWORD);

/* Connect to mongoDB cloud database. */
mongoose
  .connect(DB, {
    /* Options to deal with deprecation warnings. Can be used generally */
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log("DB connection successful."));

// console.log(process.env);

/* Run server. */
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

/* Handle all unhandled rejections from async code. */
process.on("unhandledRejection", err => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
