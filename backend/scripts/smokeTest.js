require("dotenv").config();

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const bcrypt = require("bcrypt");
const pool = require("../db");
const app = require("../server");

async function main() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be configured for smoke tests.");

  const marker = crypto.randomBytes(8).toString("hex");
  const email = (role) => `smoke-${role}-${marker}@example.invalid`;
  const password = `SmokePass!${marker.slice(0, 4)}`;
  const ids = { users: [], stores: [] };
  const server = http.createServer(app);

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function request(path, { method = "GET", token, body } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json();
      return { status: response.status, payload };
    }

    function expectStatus(result, status, label) {
      assert.equal(result.status, status, `${label}: expected HTTP ${status}, got ${result.status}; ${JSON.stringify(result.payload)}`);
    }

    const ownerHash = await bcrypt.hash(password, 12);
    const adminHash = await bcrypt.hash(password, 12);
    const ownerResult = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, 'STORE_OWNER') RETURNING id`,
      [`Smoke Owner ${marker}`, email("owner"), "Smoke test address", ownerHash]
    );
    const ownerId = ownerResult.rows[0].id;
    ids.users.push(ownerId);

    const adminResult = await pool.query(
      `INSERT INTO users (name, email, address, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ADMIN') RETURNING id`,
      [`Smoke Admin ${marker}`, email("admin"), "Smoke test address", adminHash]
    );
    const adminId = adminResult.rows[0].id;
    ids.users.push(adminId);

    const storeResult = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`Smoke Store ${marker}`, email("store"), "Smoke test avenue", ownerId]
    );
    const storeId = storeResult.rows[0].id;
    ids.stores.push(storeId);

    const registration = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: `Smoke Test User ${marker}`,
        email: email("user"),
        address: "Smoke test address",
        password,
      },
    });
    expectStatus(registration, 201, "normal user registration");
    const userId = registration.payload.user.id;
    ids.users.push(userId);

    const [userLogin, ownerLogin, adminLogin] = await Promise.all([
      request("/api/auth/login", { method: "POST", body: { email: email("user"), password } }),
      request("/api/auth/login", { method: "POST", body: { email: email("owner"), password } }),
      request("/api/auth/login", { method: "POST", body: { email: email("admin"), password } }),
    ]);
    expectStatus(userLogin, 200, "normal user login");
    expectStatus(ownerLogin, 200, "store owner login");
    expectStatus(adminLogin, 200, "admin login");
    const userToken = userLogin.payload.token;
    const ownerToken = ownerLogin.payload.token;
    const adminToken = adminLogin.payload.token;

    expectStatus(await request("/api/stores"), 401, "anonymous store listing access");
    expectStatus(await request("/api/stores", { token: ownerToken }), 403, "owner store listing access");
    expectStatus(await request("/api/admin/dashboard", { token: userToken }), 403, "user admin access");
    expectStatus(await request("/api/owner/dashboard", { token: userToken }), 403, "user owner dashboard access");
    expectStatus(await request("/api/stores", { token: adminToken }), 403, "admin user store listing access");
    expectStatus(await request("/api/admin/dashboard", { token: ownerToken }), 403, "owner admin access");
    expectStatus(await request("/api/owner/dashboard", { token: adminToken }), 403, "admin owner dashboard access");

    const badScore = await request(`/api/stores/${storeId}/ratings`, {
      method: "POST", token: userToken, body: { score: 6 },
    });
    expectStatus(badScore, 400, "rating score validation");

    const createRating = await request(`/api/stores/${storeId}/ratings`, {
      method: "POST", token: userToken, body: { score: 4 },
    });
    expectStatus(createRating, 201, "rating submission");

    const duplicateRating = await request(`/api/stores/${storeId}/ratings`, {
      method: "POST", token: userToken, body: { score: 3 },
    });
    expectStatus(duplicateRating, 409, "duplicate rating prevention");

    const updateRating = await request(`/api/stores/${storeId}/ratings`, {
      method: "PUT", token: userToken, body: { score: 5 },
    });
    expectStatus(updateRating, 200, "rating modification");
    assert.equal(updateRating.payload.rating.score, 5);

    const storeList = await request(`/api/stores?search=${encodeURIComponent(marker)}`, { token: userToken });
    expectStatus(storeList, 200, "normal user store search");
    const listedStore = storeList.payload.stores.find((store) => String(store.id) === String(storeId));
    assert.ok(listedStore, "searched store is returned");
    assert.equal(Number(listedStore.average_rating), 5);
    assert.equal(Number(listedStore.user_rating), 5);

    const ownerDashboard = await request("/api/owner/dashboard", { token: ownerToken });
    expectStatus(ownerDashboard, 200, "store owner dashboard");
    const ownerStore = ownerDashboard.payload.stores.find((store) => String(store.id) === String(storeId));
    assert.ok(ownerStore, "owner dashboard includes the owner's store");
    assert.equal(Number(ownerStore.average_rating), 5);
    assert.equal(ownerStore.rating_count, 1);
    assert.equal(ownerStore.ratings.length, 1);
    assert.equal(String(ownerStore.ratings[0].user_id), String(userId));

    expectStatus(await request("/api/admin/dashboard", { token: adminToken }), 200, "admin dashboard access");
    const adminUsers = await request("/api/admin/users?email=smoke-user", { token: adminToken });
    expectStatus(adminUsers, 200, "admin user listing");
    assert.ok(adminUsers.payload.users.some((user) => String(user.id) === String(userId)));
    const adminStores = await request("/api/admin/stores?name=Smoke%20Store", { token: adminToken });
    expectStatus(adminStores, 200, "admin store listing");
    const adminStore = adminStores.payload.stores.find((store) => String(store.id) === String(storeId));
    assert.ok(adminStore, "admin store listing includes the test store");
    assert.equal(Number(adminStore.average_rating), 5);

    console.log("Smoke checks passed: registration/login, role access, store search, rating validation/create/update, and owner/admin dashboards.");
  } finally {
    try {
      if (ids.users.length || ids.stores.length) {
        await pool.query(
          `DELETE FROM ratings
           WHERE user_id = ANY($1::bigint[]) OR store_id = ANY($2::bigint[])`,
          [ids.users, ids.stores]
        );
      }
      if (ids.stores.length) {
        await pool.query("DELETE FROM stores WHERE id = ANY($1::bigint[])", [ids.stores]);
      }
      if (ids.users.length) {
        await pool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [ids.users]);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
}

main().catch((error) => {
  console.error("Smoke checks failed:", error.message);
  process.exitCode = 1;
});
