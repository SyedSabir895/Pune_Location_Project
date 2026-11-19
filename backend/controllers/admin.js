const bcrypt = require("bcrypt");
const pool = require("../db");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const ALLOWED_ROLES = new Set(["ADMIN", "USER", "STORE_OWNER"]);

function validText(value, min, max) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function parseListOptions(query, allowedSortFields, defaultSort) {
  const sortBy = allowedSortFields.has(query.sortBy) ? query.sortBy : defaultSort;
  const sortOrder = String(query.sortOrder || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0);
  return { sortBy, sortOrder, limit, offset };
}

async function getDashboard(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM stores) AS total_stores,
        (SELECT COUNT(*) FROM ratings) AS total_ratings
    `);
    const row = result.rows[0];
    return res.json({
      totalUsers: Number(row.total_users),
      totalStores: Number(row.total_stores),
      totalRatings: Number(row.total_ratings),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ message: "Unable to load dashboard." });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, address, password, role } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";

    if (!validText(name, 20, 60) || !validText(address, 1, 400) || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Provide a valid name (20-60 characters), email, and address (up to 400 characters).",
      });
    }
    if (typeof password !== "string" || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: "Password must be 8-16 characters and include an uppercase letter and a special character.",
      });
    }
    if (!ALLOWED_ROLES.has(normalizedRole)) {
      return res.status(400).json({ message: "Role must be ADMIN, USER, or STORE_OWNER." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role, created_at`,
      [name.trim(), normalizedEmail, address.trim(), passwordHash, normalizedRole]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email is already registered." });
    }
    console.error("Admin create user error:", error);
    return res.status(500).json({ message: "Unable to create user." });
  }
}

async function createStore(req, res) {
  try {
    const { name, email, address, ownerId } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const parsedOwnerId = Number(ownerId);

    if (!validText(name, 1, 255) || !EMAIL_REGEX.test(normalizedEmail) || !validText(address, 1, 400)) {
      return res.status(400).json({ message: "Provide a valid store name, email, and address (up to 400 characters)." });
    }
    if (!Number.isSafeInteger(parsedOwnerId) || parsedOwnerId <= 0) {
      return res.status(400).json({ message: "A valid ownerId is required." });
    }

    const owner = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'STORE_OWNER'", [parsedOwnerId]);
    if (owner.rowCount === 0) {
      return res.status(400).json({ message: "ownerId must belong to an existing store owner." });
    }

    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, address, owner_id, created_at`,
      [name.trim(), normalizedEmail, address.trim(), parsedOwnerId]
    );
    return res.status(201).json({ store: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This store owner is already linked to a store, or a unique value conflicts." });
    }
    console.error("Admin create store error:", error);
    return res.status(500).json({ message: "Unable to create store." });
  }
}

async function listUsers(req, res) {
  try {
    const { sortBy, sortOrder, limit, offset } = parseListOptions(
      req.query,
      new Set(["name", "email", "address", "role", "created_at"]),
      "name"
    );
    // The challenge's user listing includes normal users and admins.
    const filters = ["u.role IN ('ADMIN', 'USER')"];
    const values = [];
    for (const field of ["name", "email", "address"]) {
      if (typeof req.query[field] === "string" && req.query[field].trim()) {
        values.push(`%${req.query[field].trim()}%`);
        filters.push(`${field} ILIKE $${values.length}`);
      }
    }
    if (typeof req.query.role === "string" && req.query.role.trim()) {
      const role = req.query.role.trim().toUpperCase();
      if (role !== "ADMIN" && role !== "USER") {
        return res.status(400).json({ message: "Role filter must be ADMIN or USER." });
      }
      values.push(role);
      filters.push(`u.role = $${values.length}`);
    }
    const where = `WHERE ${filters.join(" AND ")}`;
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.role, u.created_at,
              CASE WHEN u.role = 'STORE_OWNER' THEN (
                SELECT ROUND(AVG(r.score)::numeric, 2)
                FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
                WHERE s.owner_id = u.id
              ) ELSE NULL END AS store_average_rating
       FROM users u ${where}
       ORDER BY u.${sortBy} ${sortOrder}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return res.json({ users: result.rows, limit, offset });
  } catch (error) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ message: "Unable to list users." });
  }
}

async function listStores(req, res) {
  try {
    const { sortBy, sortOrder, limit, offset } = parseListOptions(
      req.query,
      new Set(["name", "email", "address", "created_at", "rating"]),
      "name"
    );
    // "rating" sorts on the aggregate; unrated stores always go last. Other keys are whitelisted columns.
    const orderBy = sortBy === "rating"
      ? `average_rating ${sortOrder} NULLS LAST, s.name ASC`
      : `s.${sortBy} ${sortOrder}`;
    const filters = [];
    const values = [];
    for (const field of ["name", "email", "address"]) {
      if (typeof req.query[field] === "string" && req.query[field].trim()) {
        values.push(`%${req.query[field].trim()}%`);
        filters.push(`s.${field} ILIKE $${values.length}`);
      }
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT s.id, s.name, s.email, s.address, s.owner_id,
              ROUND(AVG(r.score)::numeric, 2) AS average_rating,
              COUNT(r.id)::int AS rating_count
       FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY ${orderBy}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return res.json({ stores: result.rows, limit, offset });
  } catch (error) {
    console.error("Admin list stores error:", error);
    return res.status(500).json({ message: "Unable to list stores." });
  }
}

async function getUserDetails(req, res) {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: "User id must be a positive integer." });
    }
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.role, u.created_at,
              CASE WHEN u.role = 'STORE_OWNER' THEN (
                SELECT ROUND(AVG(r.score)::numeric, 2)
                FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
                WHERE s.owner_id = u.id
              ) ELSE NULL END AS store_average_rating
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "User not found." });
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Admin user details error:", error);
    return res.status(500).json({ message: "Unable to load user details." });
  }
}

// Lightweight list for the "Add store" owner picker: every STORE_OWNER with how many stores they already have.
async function listStoreOwners(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, COUNT(s.id)::int AS store_count
       FROM users u
       LEFT JOIN stores s ON s.owner_id = u.id
       WHERE u.role = 'STORE_OWNER'
       GROUP BY u.id
       ORDER BY u.name ASC`
    );
    return res.json({ owners: result.rows });
  } catch (error) {
    console.error("Admin list store owners error:", error);
    return res.status(500).json({ message: "Unable to list store owners." });
  }
}

module.exports = { getDashboard, createUser, createStore, listUsers, listStores, getUserDetails, listStoreOwners };
