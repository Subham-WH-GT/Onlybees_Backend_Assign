// require("dotenv").config();
// const fs = require("fs");
// const path = require("path");
// const { getDb } = require("./db");

// async function main() {
//   // Ensure data directory exists
//   const dbPath = process.env.SQLITE_PATH || "./data/app.db";
//   const dir = path.dirname(path.resolve(dbPath));
//   fs.mkdirSync(dir, { recursive: true });

//   const db = await getDb();

//   // Good defaults for concurrency
//   await db.exec(`PRAGMA journal_mode = WAL;`);
//   await db.exec(`PRAGMA busy_timeout = 5000;`);
//   await db.exec(`PRAGMA foreign_keys = ON;`);

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS events (
//       id TEXT PRIMARY KEY,
//       name TEXT NOT NULL,
//       created_at TEXT NOT NULL
//     );
//   `);

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS sections (
//       id TEXT PRIMARY KEY,
//       event_id TEXT NOT NULL,
//       name TEXT NOT NULL,
//       price REAL NOT NULL,
//       capacity INTEGER NOT NULL,
//       remaining INTEGER NOT NULL,
//       created_at TEXT NOT NULL,
//       FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
//     );
//   `);

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS bookings (
//       id TEXT PRIMARY KEY,
//       event_id TEXT NOT NULL,
//       section_id TEXT NOT NULL,
//       qty INTEGER NOT NULL,
//       created_at TEXT NOT NULL,
//       FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
//       FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE
//     );
//   `);

//   await db.exec(`CREATE INDEX IF NOT EXISTS idx_sections_event_id ON sections(event_id);`);
//   await db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_section_id ON bookings(section_id);`);

//   console.log("✅ SQLite DB initialized at:", path.resolve(dbPath));
// }

// main().catch((e) => {
//   console.error("❌ DB init failed:", e);
//   process.exit(1);
// });


require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { openDb } = require("./db");

async function main() {
  const dbPath = process.env.SQLITE_PATH || "./data/app.db";
  const dir = path.dirname(path.resolve(dbPath));
  fs.mkdirSync(dir, { recursive: true });

  const db = await openDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      capacity INTEGER NOT NULL CHECK (capacity >= 0),
      remaining INTEGER NOT NULL CHECK (remaining >= 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      qty INTEGER NOT NULL CHECK (qty > 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_sections_event_id ON sections(event_id);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_section_id ON bookings(section_id);`);

  await db.close();

  console.log("✅ SQLite DB initialized at:", path.resolve(dbPath));
}

main().catch((e) => {
  console.error("❌ DB init failed:", e);
  process.exit(1);
});
