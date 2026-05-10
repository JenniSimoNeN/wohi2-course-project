const app = require("./app");
const PORT = process.env.PORT || 3000;
const prisma = require("./lib/prisma");
const logger = require("./lib/logger");


// Start the server
app.listen(PORT, () => {
  logger.info({port: PORT}, `Server is runnig on http://localhost:${PORT}`);
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

