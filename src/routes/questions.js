const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /api/questions/,/api/questions?keyword=food
router.get("/", (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.json(questions);
    }

    const filteredQuestions = questions.filter(question =>
        question.keywords.includes(keyword));

  res.json(filteredQuestions);
});

// GET /api/questions/:questionId
// Show a specific post
router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = questions.find((q) => q.id === questionId);

    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }

    res.json(question);
});

// POST /api/questions
router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }
    const existingIds = questions.map(q=>q.id) // [1,2,3,4]
    const maxId = Math.max(...existingIds)
    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
}); 

// PUT /api/questions/:guestionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = questions.find((q) => q.id === questionId);
    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }


    const {question: newQuestion, answer, keywords} = req.body;
    if (!newQuestion || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }
    question.question = newQuestion;
    question.answer = answer;
    question.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(question);
});

// DELETE /api/questions/:questionId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex(q=>q.id === questionId);

    if(questionIndex === -1) {
        return res.status(404).json({msg: "Question not found"})
    }

    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg: "Question deleted successfully!",
        question: deletedQuestion
    });

});





module.exports = router;
