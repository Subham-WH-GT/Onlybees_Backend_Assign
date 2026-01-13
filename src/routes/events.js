
const express = require("express");
const { randomUUID } = require("crypto");
const { openDb } = require("../db/db");
const { createEventSchema } = require("../validators/eventSchemas");

const router = express.Router();

// POST /events/create
router.post("/create", async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { name, sections } = parsed.data;
  const eventId = randomUUID();
  const now = new Date().toISOString();

  const db = await openDb();
  try {
    await db.exec("BEGIN");

    await db.run(`INSERT INTO events (id, name, created_at) VALUES (?, ?, ?)`, [
      eventId,
      name,
      now,
    ]);

    const createdSections = [];
    for (const s of sections) {
      const sectionId = randomUUID();
      await db.run(
        `INSERT INTO sections (id, event_id, name, price, capacity, remaining, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sectionId, eventId, s.name, s.price, s.capacity, s.capacity, now]
      );
      createdSections.push({
        id: sectionId,
        event_id: eventId,
        name: s.name,
        price: s.price,
        capacity: s.capacity,
        remaining: s.capacity,
      });
    }

    await db.exec("COMMIT");
    return res.status(201).json({
      event: { id: eventId, name, created_at: now },
      sections: createdSections,
    });
  } catch (e) {
    try {
      await db.exec("ROLLBACK");
    } catch (_) {}
    return res.status(500).json({ error: "Failed to create event", details: e.message });
  } finally {
    await db.close();
  }
});

// GET /events/:id
router.get("/:id", async (req, res) => {
  const eventId = req.params.id;
  const db = await openDb();

  try {
    const event = await db.get(`SELECT id, name, created_at FROM events WHERE id = ?`, [eventId]);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const sections = await db.all(
      `SELECT id, name, price, capacity, remaining
       FROM sections
       WHERE event_id = ?
       ORDER BY created_at ASC`,
      [eventId]
    );

    return res.json({ ...event, sections });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch event", details: e.message });
  } finally {
    await db.close();
  }
});

module.exports = router;
