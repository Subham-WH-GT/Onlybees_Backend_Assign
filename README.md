# Ticket Booking API with Concurrency-Safe Locking (SQLite)

## Tech
- Node.js + Express
- SQLite

## Setup
1) Install:
npm install

2) Create .env:
PORT=3000
SQLITE_PATH=./data/app.db

3) Initialize DB:
npm run db:init

4) Run server:
npm run dev

## Endpoints (as required)
- POST /events/create
- GET /events/:id
- POST /book
- GET /bookings

## Locking Strategy & Concurrency Handling

### Problem
Concurrent bookings can oversell if multiple requests read the same remaining value before updates happen.

### Solution
The `/book` endpoint uses a write-locking transaction:
- `BEGIN IMMEDIATE` to acquire a write lock early
- Read section.remaining
- If enough, update remaining and insert booking
- Commit

This serializes concurrent writers and prevents overselling.

### Retry Handling
SQLite can return `SQLITE_BUSY` / "database is locked" under contention.
The `/book` endpoint retries a few times with a short backoff.

## Validation
Run the race test:
npm run race:test

It fires 10 parallel requests against capacity 5 and checks:
- remaining >= 0
- totalBooked <= capacity
