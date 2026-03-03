import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.routes.ts';
import gameRoutes from '../routes/game.routes.ts';
import { prisma } from '../lib/prisma.ts';

// Setup a test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);

// Mock Data
const testUser = {
  phone_number: '9999999999',
  password: 'testpassword'
};

let authToken = '';
let sessionId = '';
let nonce = '';

describe('Game Platform API Tests', () => {

  // FIXED: Cleanup dependencies first to avoid Foreign Key errors
  beforeAll(async () => {
    const existingUser = await prisma.user.findUnique({
      where: { phone_number: testUser.phone_number }
    });

    if (existingUser) {
      // 1. Delete GameSessions linked to this user
      await prisma.gameSession.deleteMany({
        where: { userId: existingUser.id }
      });
      
      // 2. Now it is safe to delete the user
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app).post('/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    authToken = res.body.token;
  });

  it('should login the user', async () => {
    const res = await request(app).post('/auth/login').send(testUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should start a game session', async () => {
    const res = await request(app)
      .post('/game/start')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('nonce');
    
    sessionId = res.body.sessionId;
    nonce = res.body.nonce;
  });

  it('should submit a score successfully', async () => {
    const res = await request(app)
      .post('/game/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId,
        nonce,
        score: 100
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Score submitted successfully');
  });

  it('should PREVENT a Replay Attack (Submitting same nonce twice)', async () => {
    const res = await request(app)
      .post('/game/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId,
        nonce, // Same nonce as before
        score: 100
      });

    // Expect 409 Conflict
    expect(res.status).toBe(409); 
    expect(res.body.error).toMatch(/Replay attack detected/);
  });
});