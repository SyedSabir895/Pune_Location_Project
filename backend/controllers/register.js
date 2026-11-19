const bcrypt = require("bcrypt");

// Adjust this path to wherever you export your PostgreSQL Pool.
const pool = require("../db/index");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

async function register(req, res) {
  try {
    const { name, email, address, password } = req.body;

    if (!name || !email || !address || !password) {
      return res.status(400).json({
        message: "Name, email, address, and password are required.",
      });
    }

    if (name.length < 20 || name.length > 60) {
      return res.status(400).json({
        message: "Name must be between 20 and 60 characters.",
      });
    }

    if (address.length > 400) {
      return res.status(400).json({
        message: "Address must be 400 characters or fewer.",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8–16 characters and include an uppercase letter and a special character.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, 'USER')
       RETURNING id, name, email, address, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), address.trim(), passwordHash]
    );

    return res.status(201).json({
      message: "Registration successful.",
      user: result.rows[0],
    });
  } catch (error) {
    // PostgreSQL unique-constraint violation (email already registered)
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email is already registered." });
    }

    console.error("Registration error:", error);
    return res.status(500).json({ message: "Unable to register right now." });
  }
}

module.exports = register;