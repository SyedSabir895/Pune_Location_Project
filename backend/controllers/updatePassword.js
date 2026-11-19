const bcrypt = require("bcrypt");
const pool = require("../db");

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "New password must be 8-16 characters and include an uppercase letter and a special character.",
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User account not found." });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newPasswordHash, req.user.id]
    );

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({ message: "Unable to update password right now." });
  }
}

module.exports = updatePassword;
