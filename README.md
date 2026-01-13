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

## What was the overselling problem?
Overselling happens when multiple users book tickets at the same time.

## What exact mechanism did they implement?
Core mechanism: Atomic database transaction with conditional update

At the backend level (inside /book API), they ensure:

Read + check + update happen inside a single transaction

Tickets are deducted only if enough tickets are available

If not enough tickets → booking fails immediately


## Why is this approach safe (or safe enough) in this setup?
This approach is considered safe because:

Atomicity
Transactions guarantee that either all booking steps succeed together or none of them do. Partial updates are impossible.

Isolation
Concurrent transactions do not interfere with each other in a way that violates data consistency. The database enforces proper ordering and locking internally.

Single source of truth
The database maintains the authoritative state of ticket availability, preventing inconsistencies caused by multiple application instances.

Invariant preservation
Critical invariants—such as remaining tickets never becoming negative and total tickets sold never exceeding capacity—are always maintained.
