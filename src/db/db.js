// require("dotenv").config();
// const path = require("path");
// const { open } = require("sqlite");
// const sqlite3 = require("sqlite3");

// let dbPromise;

// function getDb() {
//   if (!dbPromise) {
//     const dbPath = process.env.SQLITE_PATH || "./data/app.db";
//     dbPromise = open({
//       filename: path.resolve(dbPath),
//       driver: sqlite3.Database,
//     });
//   }
//   return dbPromise;
// }

// module.exports = { getDb };


require("dotenv").config();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

// Open a NEW connection each time (safe for concurrent HTTP requests)
async function openDb() {
  const dbPath = process.env.SQLITE_PATH || "./data/app.db";
  const db = await open({
    filename: path.resolve(dbPath),
    driver: sqlite3.Database,
  });

  // Good concurrency defaults
  await db.exec(`PRAGMA journal_mode = WAL;`);
  await db.exec(`PRAGMA busy_timeout = 5000;`);
  await db.exec(`PRAGMA foreign_keys = ON;`);

  return db;
}

module.exports = { openDb };
