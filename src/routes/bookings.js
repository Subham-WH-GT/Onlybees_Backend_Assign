
const express = require("express");
const { randomUUID } = require("crypto");
const { openDb } = require("../db/db");
const { createBookingSchema } = require("../validators/bookingSchemas");

const router = express.Router();

// POST /book
router.post("/", async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { eventId, sectionId, qty } = parsed.data;
  const now = new Date().toISOString();

  const MAX_RETRIES = 8;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const db = await openDb();

    try {
      // Acquire write lock early so concurrent writers serialize safely
      await db.exec("BEGIN IMMEDIATE");

      const section = await db.get(
        `SELECT id, event_id, remaining, capacity
         FROM sections
         WHERE id = ? AND event_id = ?`,
        [sectionId, eventId]
      );

      if (!section) {
        await db.exec("ROLLBACK");
        return res.status(404).json({ error: "Section not found for this event" });
      }

      if (section.remaining < qty) {
        await db.exec("ROLLBACK");
        return res.status(409).json({
          error: "Not enough seats remaining",
          remaining: section.remaining,
          requested: qty,
        });
      }

      const newRemaining = section.remaining - qty;

      await db.run(`UPDATE sections SET remaining = ? WHERE id = ?`, [newRemaining, sectionId]);

      const bookingId = randomUUID();
      await db.run(
        `INSERT INTO bookings (id, event_id, section_id, qty, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingId, eventId, sectionId, qty, now]
      );

      await db.exec("COMMIT");

      return res.status(201).json({
        message: "Booking successful",
        booking: { id: bookingId, eventId, sectionId, qty, created_at: now },
        remainingAfter: newRemaining,
      });
    } catch (e) {
      try {
        await db.exec("ROLLBACK");
      } catch (_) {}

      const msg = String(e?.message || "");

      // Retry when SQLite is busy/locked
      if (msg.includes("SQLITE_BUSY") || msg.includes("database is locked")) {
        await db.close();
        await new Promise((r) => setTimeout(r, 30 * attempt)); // backoff
        continue;
      }

      await db.close();
      return res.status(500).json({ error: "Booking failed", details: msg });
    } finally {
      try {
        await db.close();
      } catch (_) {}
    }
  }

  return res.status(503).json({ error: "Database busy, please retry" });
});

// GET /bookings
router.get("/", async (_req, res) => {
  const db = await openDb();
  try {
    const rows = await db.all(
      `SELECT
        b.id AS booking_id,
        b.qty,
        b.created_at,
        e.id AS event_id,
        e.name AS event_name,
        s.id AS section_id,
        s.name AS section_name,
        s.price,
        s.capacity
      FROM bookings b
      JOIN events e ON e.id = b.event_id
      JOIN sections s ON s.id = b.section_id
      ORDER BY b.created_at DESC`
    );

    return res.json({ bookings: rows });
  } catch (e) {
    return res.status(500).json({ error: "Failed to list bookings", details: e.message });
  } finally {
    await db.close();
  }
});

module.exports = router;
