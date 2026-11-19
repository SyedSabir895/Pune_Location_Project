const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, name, email, address, role, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Use the same response for unknown email and incorrect password.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({ message: "Unable to log in right now." });
    }

    const token = jwt.sign(
      { role: user.role },
      process.env.JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to log in right now." });
  }
}

module.exports = login;