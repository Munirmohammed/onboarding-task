require("dotenv/config");
const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./modules/auth/auth.routes");
const authMiddleware = require("./modules/middleware/auth.middleware");

const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("server running");
});
app.use("/auth", authRoutes);
app.get(
  "/protected",
  authMiddleware,
  (req, res) => {
    res.json({ message: "Protected route", userId: req.userId });
  },
);


const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Onboarding Task API",
      version: "1.0.0",
      description: "API documentation for the onboarding task",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./src/modules/**/*.routes.js", "./src/server.js"], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
