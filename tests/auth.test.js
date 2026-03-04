const request = require("supertest");
const app     = require("../src/app");
const prisma  = require("../src/config/prisma");

// Unique suffix so parallel runs don't collide
const uid  = () => Math.random().toString(36).slice(2, 8);
const user = { username: `u_${uid()}`, phone: `+1555${Date.now().toString().slice(-7)}`, password: "Password1!" };

afterAll(async () => {
  // Clean up test data
  await prisma.otp.deleteMany({ where: { user: { username: user.username } } });
  await prisma.user.deleteMany({ where: { username: user.username } });
  await prisma.$disconnect();
});

// ── Register ─────────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("creates a new user and returns a JWT", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(user.username);
  });

  it("rejects duplicate username", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(409);
  });

  it("rejects weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...user, username: `u_${uid()}`, password: "short" });
    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("returns a JWT for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: "WrongPass1!" });
    expect(res.status).toBe(401);
  });

  it("rejects unknown user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost_user", password: "Password1!" });
    expect(res.status).toBe(401);
  });
});

// ── /me ───────────────────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: user.password });
    token = res.body.token;
  });

  it("returns the authenticated user's profile", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(user.username);
    expect(res.body.password).toBeUndefined(); // never expose hash
  });

  it("rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.token");
    expect(res.status).toBe(401);
  });
});

// ── Forgot password / OTP / Reset ────────────────────────────────────────────
describe("Forgot-password flow", () => {
  it("always returns 200 regardless of phone existence (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ phone: "+10000000000" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP/i);
  });

  it("rejects expired/invalid OTP", async () => {
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: user.phone, code: "000000" });
    expect(res.status).toBe(400);
  });

  it("rejects reset with bad token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ resetToken: "bad.token.here", newPassword: "NewPass1!" });
    expect(res.status).toBe(400);
  });
});