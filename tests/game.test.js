const request = require("supertest");
const { v4: uuidv4 } = require("uuid");
const app    = require("../src/app");
const prisma = require("../src/config/prisma");

const uid  = () => Math.random().toString(36).slice(2, 8);
const creds = { username: `g_${uid()}`, phone: `+1444${Date.now().toString().slice(-7)}`, password: "Password1!" };
let token;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send(creds);
  token = reg.body.token;
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { username: creds.username } });
  if (user) {
    await prisma.score.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

// ── Play ──────────────────────────────────────────────────────────────────────
describe("POST /api/game/play", () => {
  it("records a score and returns points for valid action", async () => {
    const res = await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "collect", nonce: uuidv4() });
    expect(res.status).toBe(201);
    expect(res.body.points).toBe(5);
    expect(res.body.action).toBe("collect");
  });

  it("awards correct points per action type", async () => {
    const cases = [
      { action: "tap",    expected: 1 },
      { action: "dodge",  expected: 3 },
      { action: "collect",expected: 5 },
    ];
    for (const { action, expected } of cases) {
      const res = await request(app)
        .post("/api/game/play")
        .set("Authorization", `Bearer ${token}`)
        .send({ action, nonce: uuidv4() });
      expect(res.body.points).toBe(expected);
    }
  });

  it("rejects replay attack — duplicate nonce", async () => {
    const nonce = uuidv4();
    // First request — should succeed
    await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "tap", nonce });

    // Second request with same nonce — must be rejected
    const res = await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "tap", nonce });
    expect(res.status).toBe(409);
  });

  it("rejects unknown action", async () => {
    const res = await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "hack", nonce: uuidv4() });
    expect(res.status).toBe(400);
  });

  it("rejects missing nonce", async () => {
    const res = await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "tap" });
    expect(res.status).toBe(400);
  });

  it("rejects non-UUID nonce", async () => {
    const res = await request(app)
      .post("/api/game/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "tap", nonce: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/game/play")
      .send({ action: "tap", nonce: uuidv4() });
    expect(res.status).toBe(401);
  });
});

// ── My Scores ─────────────────────────────────────────────────────────────────
describe("GET /api/game/scores", () => {
  it("returns paginated scores for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/game/scores")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
describe("GET /api/game/leaderboard", () => {
  it("returns ranked list without auth", async () => {
    const res = await request(app).get("/api/game/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 1) {
      expect(res.body[0].totalPoints).toBeGreaterThanOrEqual(res.body[1].totalPoints);
    }
  });

  it("respects limit query param", async () => {
    const res = await request(app).get("/api/game/leaderboard?limit=1");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });
});