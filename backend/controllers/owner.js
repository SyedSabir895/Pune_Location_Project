const pool = require("../db");

async function getDashboard(req, res) {
  try {
    const storeResult = await pool.query(
      `SELECT s.id, s.name, s.email, s.address,
              ROUND(AVG(r.score)::numeric, 2) AS average_rating,
              COUNT(r.id)::int AS rating_count
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.owner_id = $1
       GROUP BY s.id
       ORDER BY s.id`,
      [req.user.id]
    );

    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message: "No store is associated with this owner account." });
    }

    const stores = await Promise.all(storeResult.rows.map(async (store) => {
      const ratingsResult = await pool.query(
        `SELECT u.id AS user_id, u.name, u.email, r.score, r.created_at, r.updated_at
         FROM ratings r
         JOIN users u ON u.id = r.user_id
         WHERE r.store_id = $1
         ORDER BY r.updated_at DESC, u.name ASC`,
        [store.id]
      );
      return { ...store, ratings: ratingsResult.rows };
    }));

    return res.json({ stores });
  } catch (error) {
    console.error("Store owner dashboard error:", error);
    return res.status(500).json({ message: "Unable to load owner dashboard." });
  }
}

module.exports = { getDashboard };
