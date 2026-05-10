require("express-async-errors");
const express = require('express');
const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");
const { NotFoundError } = require("./lib/errors");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");


app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

module.exports = app;