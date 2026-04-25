const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();


const seedQuestions = [
  {
    id: 1,
    question: "What is the worlds most popular ice cream flavor?",
    answer: "Vanilla",
    keywords: ["food", "ice cream"],
  },
  {
    id: 2,
    question: "Which country is the origin of Paella?",
    answer: "Spain",
    keywords: ["food", "paella"],
  },
  {
    id: 3,
    question: "What type of pastas name means “little tongues” in Italian?",
    answer: "Linguine",
    keywords:  ["pasta", "Italy"],
  },
  {
    id: 4,
    question: "Which vitamin is especially high in citrus fruits?",
    answer: "Vitamin C",
    keywords: ["fruit", "healthy"],
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

   // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        user: {
          connect: { id: user.id },
        },
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

