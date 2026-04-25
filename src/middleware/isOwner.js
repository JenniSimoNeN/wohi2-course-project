const prisma = require("../lib/prisma");

async function isOwner (req, res, next) {
    const id = Number(req.params.postId);
    const question = await prisma.question.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.userId !== req.user.userId) {
      return res.status(403).json({ error: "You can only modify your own questions!" });
    }

    // Attach the record to the request so the route handler can reuse it
    req.question = question;
    next();
  
}

module.exports = isOwner;