const express = require('express');
const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");
const PORT = process.env.PORT || 3000;




// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  res.status(404).json({msg: "Not found"});
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

