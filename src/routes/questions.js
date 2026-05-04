const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user?.name || null,
    solved: question.attempts?.length > 0,
    attemptCount: question._count?.attempts ?? 0,
    user: undefined,
    _count: undefined,
    attempts: undefined,
  };
}

router.use(authenticate);

// GET /api/questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        attempts: {
          where: {
            userId: req.user.userId,
            correct: true,
          },
          take: 1,
        },
        _count: { select: { attempts: true } },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: questions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/questions/:id
router.get("/:questionId", async (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: {
          userId: req.user.userId,
          correct: true,
        },
        take: 1,
      },
      _count: { select: { attempts: true } },
    },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found :(" });
  }

  res.json(formatQuestion(question));
});

// POST
router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are mandatory" });
  }

  const keywordsArray = keywords
    ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: {
          userId: req.user.userId,
          correct: true,
        },
        take: 1,
      },
      _count: { select: { attempts: true } },
    },
  });

  res.status(201).json(formatQuestion(newQuestion));
});

// PUT
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
  const questionId = Number(req.params.questionId);
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are mandatory" });
  }

  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!existingQuestion) {
    return res.status(404).json({ message: "Question not found :(" });
  }

  const keywordsArray = keywords
    ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const data = {
    question,
    answer,
    keywords: {
      set: [],
      connectOrCreate: keywordsArray.map((kw) => ({
        where: { name: kw },
        create: { name: kw },
      })),
    },
  };

  if (req.file) {
    data.imageUrl = `/uploads/${req.file.filename}`;
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data,
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: {
          userId: req.user.userId,
          correct: true,
        },
        take: 1,
      },
      _count: { select: { attempts: true } },
    },
  });

  res.json(formatQuestion(updatedQuestion));
});

// DELETE
router.delete("/:questionId", isOwner, async (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      keywords: true,
      user: true,
      attempts: {
        where: {
          userId: req.user.userId,
          correct: true,
        },
        take: 1,
      },
      _count: { select: { attempts: true } },
    },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found :(" });
  }

  await prisma.question.delete({ where: { id: questionId } });

  res.json({
    message: "Question deleted successfully!",
    question: formatQuestion(question),
  });
});

// PLAY
router.post("/:questionId/play", async (req, res) => {
  const questionId = Number(req.params.questionId);
  const { answer } = req.body;

  if (!answer) {
    return res.status(400).json({ message: "Answer is required" });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const normalize = (s) => s?.trim().toLowerCase();
  const correct = normalize(answer) === normalize(question.answer);

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user.userId,
      questionId,
      submittedAnswer: answer,
      correct,
    },
  });

  res.status(201).json({
    id: attempt.id,
    correct,
    submittedAnswer: answer,
    correctAnswer: question.answer,
    createdAt: attempt.createdAt,
  });
});

module.exports = router;

 
// I trained to do this but I think I don´t need it in my project so I commeted it. 
// DELETE /api/questions/:questionId/attempt
// router.delete("/:questionId/attempt", async (req, res) => {
    // const questionId = Number(req.params.questionId);

    // const question = await prisma.question.findUnique({ where: { id: questionId } });
    // if (!question) {
       // return res.status(404).json({ message: "Question not found" });
   // }

    // await prisma.attempt.deleteMany({
       // where: { userId: req.user.userId, questionId },
   //  });

    // const attemptCount = await prisma.attempt.count({ where: { questionId } });

    // res.json({ questionId, attempted: false, attemptCount });
// });




