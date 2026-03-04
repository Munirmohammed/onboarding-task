# High-Throughput Game Platform API

A robust, high-throughput backend platform built for an interactive gaming experience. Features include user authentication, secure gameplay mechanics, a bulk-processing engine for coin bonuses, robust SMS queuing, and a management dashboard.

## 🏗 Tech Stack
* **Runtime:** Node.js (v20) / Express.js
* **Database:** PostgreSQL (with Prisma ORM v7)
* **Caching/Queues:** Redis & Bull
* **Security:** Helmet, Express Rate Limit, bcrypt, JWT
* **Infrastructure:** Docker & Docker Compose

---

## 🚀 Architectural Highlights

To satisfy the high-throughput and security requirements, the following design decisions were implemented:

1. **Replay Attack Prevention (Native Database Lock):**
   Instead of relying on fragile caching for replay-attack prevention, clients must submit a fresh UUID `nonce` per game action. The `Score` table utilizes a `UNIQUE` constraint on the `nonce` column. Duplicate requests instantly yield a Prisma `P2002` error, resulting in a strict `409 Conflict`.
2. **Asynchronous Bulk Processing:**
   When parsing large datasets (e.g., 50,000+ numbers for Coin Bonuses), the CSV is chunked in-memory (batches of 500) and offloaded to a Redis-backed Bull queue. The API returns a `202 Accepted` immediately, preventing request timeouts.
3. **Resilient SMS Queuing:**
   SMS operations are decoupled from main thread requests. They are handled by an isolated worker process with exponential backoff and automatic retries to handle 3rd-party API rate limits.
4. **Database Query Optimization:**
   All large queries utilize `@@index`ing. Analytics and dashboard logic leverage Prisma's database-level `.aggregate()` and `.groupBy()` to avoid loading large datasets into Node.js memory.

---

## 🛠 Local Setup & Installation

### Prerequisites
* Docker & Docker Compose installed on your machine.
* Node.js v20+ (for local test execution).

### 1. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
*Note: The default variables in `.env` are already configured to connect to the Docker containers seamlessly. If you want to test live SMS functionality, fill in your `TWILIO_*` credentials. Otherwise, the app mocks SMS delivery perfectly in testing.*

### 2. Start Infrastructure
Start the database (PostgreSQL) and Queue Engine (Redis) in the background:
```bash
docker-compose up postgres redis -d
```
*(Note: Postgres maps to host port `5433` to prevent conflicts with local instances you may already have running).*

### 3. Database Migrations
Run Prisma to apply the schema to the running Docker database:
```bash
npm install
npx prisma migrate dev --name init
```

### 4. Start the Application
You can now boot the Node server and background workers:
```bash
npm run dev
```
The server is now live at `http://localhost:3000`.

---

## 🧪 Testing

The test suite includes full integration tests using the real database schema. Twilio API calls are gracefully mocked in the test environment to prevent actual SMS charges.

To run the test suite:
```bash
# Ensure the Postgres Docker container is running first
npm run test
```

---

## 📚 API Reference

> **Authentication:** Endpoints marked with 🔒 require an `Authorization` header:
> `Authorization: Bearer <your_jwt_token>`

### 1. Auth & OTP

#### Register a New User
* **POST** `/api/auth/register`
* **Body:**
  ```json
  {
    "username": "player1",
    "phone": "+15551234567",
    "password": "SecurePassword123!"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUz...",
    "user": { "id": "uuid", "username": "player1", "phone": "+15551234567" }
  }
  ```

#### Login
* **POST** `/api/auth/login`
* **Body:**
  ```json
  { "username": "player1", "password": "SecurePassword123!" }
  ```
* **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUz...",
    "user": { "id": "uuid", "username": "player1", "phone": "+15551234567" }
  }
  ```

#### Forgot Password (OTP Generation)
* **POST** `/api/auth/forgot-password`
* **Body:**
  ```json
  { "phone": "+15551234567" }
  ```
* **Response (200 OK):**
  ```json
  { "message": "If that number is registered, an OTP was sent." }
  ```

#### Verify OTP
* **POST** `/api/auth/verify-otp`
* **Body:**
  ```json
  { "phone": "+15551234567", "code": "123456" }
  ```
* **Response (200 OK):** *(Returns a 15-minute temporary reset token)*
  ```json
  { "resetToken": "eyJhbGciOiJIUz..." }
  ```

#### Reset Password
* **POST** `/api/auth/reset-password`
* **Body:**
  ```json
  { "resetToken": "eyJhbGciOiJIUz...", "newPassword": "NewSecurePassword!" }
  ```
* **Response (200 OK):**
  ```json
  { "message": "Password updated successfully." }
  ```

---

### 2. Gameplay

#### Play Game (Score Points) 🔒
* **POST** `/api/game/play`
* **Body:** *(Action must be `tap` (1pt), `dodge` (3pts), or `collect` (5pts). Nonce must be a fresh UUIDv4 per request to prevent replay attacks).*
  ```json
  {
    "action": "collect",
    "nonce": "123e4567-e89b-12d3-a456-426614174000"
  }
  ```
* **Response (201 Created):**
  ```json
  { "scoreId": "uuid", "points": 5, "action": "collect" }
  ```
* **Error (409 Conflict):** If the exact same `nonce` is reused.

#### Get My Scores 🔒
* **GET** `/api/game/scores?page=1&limit=20`
* **Response (200 OK):**
  ```json
  {
    "items": [
      { "id": "uuid", "points": 5, "createdAt": "2024-03-04T12:00:00Z" }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
  ```

#### Global Leaderboard
* **GET** `/api/game/leaderboard?limit=10`
* **Response (200 OK):**
  ```json
  [
    { "rank": 1, "userId": "uuid", "username": "player1", "totalPoints": 4500 }
  ]
  ```

---

### 3. Bulk Coin Bonuses

#### Upload Bulk Phone CSV 🔒
* **POST** `/api/coins/bulk-upload`
* **Format:** `multipart/form-data`
* **Field:** `file` (Attach a `.csv` or `.txt` file containing phone numbers).
* **Response (202 Accepted):** *(Processes in background queue)*
  ```json
  {
    "message": "Bulk upload accepted, processing in background.",
    "batchId": "uuid",
    "total": 50000,
    "chunks": 100
  }
  ```

#### List Bulk Upload Batches 🔒
* **GET** `/api/coins/batches`
* **Response (200 OK):**
  ```json
  [
    { "batchId": "uuid", "credited": 49950, "startedAt": "2024-03-04T12:00:00Z" }
  ]
  ```

---

### 4. Admin Dashboard

#### Get Platform Statistics 🔒
* **GET** `/api/dashboard/stats`
* **Response (200 OK):**
  ```json
  {
    "users": { "total": 15420 },
    "scores": { "total": 450123, "pointsAwarded": 1250344 },
    "coins": { "totalInCirculation": 5000000 },
    "sms": { "PENDING": 12, "SENT": 49980, "FAILED": 8 }
  }
  ```

#### Get Users List 🔒
* **GET** `/api/dashboard/users?page=1&limit=50`
* **Response (200 OK):**
  ```json
  {
    "items": [
      { "id": "uuid", "username": "player1", "phone": "+15551234567", "coins": 100, "createdAt": "..." }
    ],
    "total": 15420,
    "page": 1,
    "limit": 50
  }
  ```

#### Get SMS Delivery Logs 🔒
* **GET** `/api/dashboard/sms?page=1&limit=50&status=FAILED`
* **Query Params:** `status` (Optional) - Filter by `PENDING`, `SENT`, or `FAILED`.
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "phone": "+15551234567",
        "message": "Your verification code is 123456.",
        "status": "FAILED",
        "attempts": 3,
        "sentAt": null,
        "createdAt": "..."
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 50
  }
  ```
