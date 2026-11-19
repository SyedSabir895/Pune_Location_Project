const pool = require("../db");

function parsePositiveId(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function listStores(req, res) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    const address = typeof req.query.address === "string" ? req.query.address.trim() : "";
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const values = [req.user.id];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(s.name ILIKE $${values.length} OR s.address ILIKE $${values.length})`);
    }
    if (name) {
      values.push(`%${name}%`);
      conditions.push(`s.name ILIKE $${values.length}`);
    }
    if (address) {
      values.push(`%${address}%`);
      conditions.push(`s.address ILIKE $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT s.id, s.name, s.address,
              ROUND(AVG(all_ratings.score)::numeric, 2) AS average_rating,
              COUNT(all_ratings.id)::int AS rating_count,
              my_rating.score AS user_rating
       FROM stores s
       LEFT JOIN ratings all_ratings ON all_ratings.store_id = s.id
       LEFT JOIN ratings my_rating ON my_rating.store_id = s.id AND my_rating.user_id = $1
       ${where}
       GROUP BY s.id, my_rating.score
       ORDER BY s.name ASC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return res.json({ stores: result.rows, limit, offset });
  } catch (error) {
    console.error("Store listing error:", error);
    return res.status(500).json({ message: "Unable to load stores." });
  }
}

async function createRating(req, res) {
  const storeId = parsePositiveId(req.params.storeId);
  const { score } = req.body;
  if (!storeId) return res.status(400).json({ message: "storeId must be a positive integer." });
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ message: "Rating score must be an integer from 1 to 5." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, store_id, score)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, store_id, score, created_at, updated_at`,
      [req.user.id, storeId, score]
    );
    return res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "You have already rated this store. Use PUT to modify your rating." });
    }
    if (error.code === "23503") {
      return res.status(404).json({ message: "Store not found." });
    }
    console.error("Create rating error:", error);
    return res.status(500).json({ message: "Unable to submit rating." });
  }
}

async function updateRating(req, res) {
  const storeId = parsePositiveId(req.params.storeId);
  const { score } = req.body;
  if (!storeId) return res.status(400).json({ message: "storeId must be a positive integer." });
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ message: "Rating score must be an integer from 1 to 5." });
  }

  try {
    const result = await pool.query(
      `UPDATE ratings
       SET score = $1, updated_at = NOW()
       WHERE user_id = $2 AND store_id = $3
       RETURNING id, user_id, store_id, score, created_at, updated_at`,
      [score, req.user.id, storeId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "You have not rated this store yet." });
    }
    return res.json({ rating: result.rows[0] });
  } catch (error) {
    console.error("Update rating error:", error);
    return res.status(500).json({ message: "Unable to update rating." });
  }
}

module.exports = { listStores, createRating, updateRating };
