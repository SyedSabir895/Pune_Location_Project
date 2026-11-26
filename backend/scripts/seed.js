/**
 * Seeds demo accounts, stores and ratings so every role can be tried right away.
 *
 *   npm run seed
 *
 * Safe to run more than once: rows that already exist (matched by email, store owner,
 * or user+store for ratings) are left untouched, and existing passwords are never changed.
 * Requires the users / stores / ratings tables to exist already.
 *
 * All demo accounts share one password: Demo@1234
 *
 *   Role          Email
 *   ------------  ---------------------------
 *   ADMIN         admin@demo.example.com
 *   USER          aarav@demo.example.com
 *   USER          zoya@demo.example.com
 *   STORE_OWNER   ravi@demo.example.com
 *   STORE_OWNER   meera@demo.example.com
 *   STORE_OWNER   kabir@demo.example.com   (no store yet, to try "Add store")
 */
require("dotenv").config({ quiet: true });

const bcrypt = require("bcrypt");
const pool = require("../db");

const DEMO_PASSWORD = "Demo@1234";

// Names must be 20–60 characters (users_name_check).
const users = [
  { key: "admin", name: "Kindred Demo Administrator", email: "admin@demo.example.com", address: "Head Office, Lower Parel, Mumbai", role: "ADMIN" },
  { key: "aarav", name: "Aarav Sharma Demo Customer", email: "aarav@demo.example.com", address: "Hill Road, Bandra West, Mumbai", role: "USER" },
  { key: "zoya", name: "Zoya Khan Demo Customer Account", email: "zoya@demo.example.com", address: "Linking Road, Khar West, Mumbai", role: "USER" },
  { key: "ravi", name: "Ravi Kumar Demo Store Owner", email: "ravi@demo.example.com", address: "Juhu Tara Road, Juhu, Mumbai", role: "STORE_OWNER" },
  { key: "meera", name: "Meera Iyer Demo Store Owner", email: "meera@demo.example.com", address: "Colaba Causeway, Colaba, Mumbai", role: "STORE_OWNER" },
  { key: "kabir", name: "Kabir Rao Demo Store Owner", email: "kabir@demo.example.com", address: "SV Road, Andheri West, Mumbai", role: "STORE_OWNER" },
];

// stores.owner_id is UNIQUE: one store per owner.
const stores = [
  { owner: "ravi", name: "Ravi's Fresh Bakery", email: "hello@ravisbakery.example.com", address: "12 Juhu Tara Road, Juhu, Mumbai 400049" },
  { owner: "meera", name: "Chai & Chapters Bookshop", email: "books@chaichapters.example.com", address: "5 Colaba Causeway, Colaba, Mumbai 400005" },
];

const ratings = [
  { user: "aarav", store: "ravi", score: 5 },
  { user: "zoya", store: "ravi", score: 4 },
  { user: "aarav", store: "meera", score: 3 },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const userIds = {};
    for (const u of users) {
      const inserted = await client.query(
        `INSERT INTO users (name, email, address, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [u.name, u.email, u.address, passwordHash, u.role]
      );
      const row = inserted.rows[0] || (await client.query("SELECT id, role FROM users WHERE email = $1", [u.email])).rows[0];
      if (row.role && row.role !== u.role) {
        throw new Error(`${u.email} already exists with role ${row.role}, expected ${u.role}. Remove it or change the seed email.`);
      }
      userIds[u.key] = row.id;
      console.log(`${inserted.rowCount ? "created " : "exists  "} ${u.role.padEnd(11)} ${u.email}`);
    }

    const storeIds = {};
    for (const s of stores) {
      const ownerId = userIds[s.owner];
      const inserted = await client.query(
        `INSERT INTO stores (name, email, address, owner_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (owner_id) DO NOTHING
         RETURNING id`,
        [s.name, s.email, s.address, ownerId]
      );
      storeIds[s.owner] = inserted.rows[0]?.id ?? (await client.query("SELECT id FROM stores WHERE owner_id = $1", [ownerId])).rows[0].id;
      console.log(`${inserted.rowCount ? "created " : "exists  "} STORE       ${s.name}`);
    }

    let createdRatings = 0;
    for (const r of ratings) {
      const inserted = await client.query(
        `INSERT INTO ratings (user_id, store_id, score)
         VALUES ($1, $2, $3)
         ON CONFLICT ON CONSTRAINT one_rating_per_user_per_store DO NOTHING`,
        [userIds[r.user], storeIds[r.store], r.score]
      );
      createdRatings += inserted.rowCount;
    }
    console.log(`ratings: ${createdRatings} created, ${ratings.length - createdRatings} already existed`);

    await client.query("COMMIT");
    console.log(`\nDemo password for every account above: ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
