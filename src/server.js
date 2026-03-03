require("dotenv/config");
const express = require("express");
const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const app = express();

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

app.get("/", async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.listen(3000, () => {
    console.log("server started");
});
