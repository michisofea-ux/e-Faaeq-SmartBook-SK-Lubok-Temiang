import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Handle BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(express.json());

// Initialize Database
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'teacher'
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        space TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        class TEXT NOT NULL,
        purpose TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Admin if not exists
    const adminRes = await pool.query("SELECT * FROM users WHERE email = $1", ["GPM_SKLT"]);
    if (adminRes.rows.length === 0) {
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)", [
        "Admin PSS",
        "GPM_SKLT",
        "GPMsklt2025",
        "admin"
      ]);
    }
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

// Call initDb
initDb();

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
    const user = result.rows[0];
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, password, "teacher"]
    );
    const user = result.rows[0];
    res.json({ user });
  } catch (error: any) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Booking Routes
app.get("/api/bookings", async (req, res) => {
  const { date, space } = req.query;
  try {
    const result = await pool.query(`
      SELECT b.*, u.name as user_name 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      WHERE b.date = $1 AND b.space = $2
    `, [date, space]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/api/bookings/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM bookings 
      WHERE user_id = $1 
      ORDER BY date DESC, time DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { user_id, space, date, time, class: className, purpose } = req.body;
  
  try {
    // Check for existing booking
    const existing = await pool.query(
      "SELECT * FROM bookings WHERE date = $1 AND time = $2 AND space = $3",
      [date, time, space]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Slot already booked" });
    }

    await pool.query(
      "INSERT INTO bookings (user_id, space, date, time, class, purpose) VALUES ($1, $2, $3, $4, $5, $6)",
      [user_id, space, date, time, className, purpose]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// Admin Stats
app.get("/api/admin/stats", async (req, res) => {
  const { month, year } = req.query;
  
  let dateFilter = "";
  let params: any[] = [];
  
  if (month && year) {
    dateFilter = "WHERE TO_CHAR(date::DATE, 'YYYY-MM') = $1";
    params = [`${year}-${month.toString().padStart(2, '0')}`];
  } else if (year) {
    dateFilter = "WHERE TO_CHAR(date::DATE, 'YYYY') = $1";
    params = [year];
  }

  try {
    const daily = await pool.query(`
      SELECT date, space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY date, space 
      ORDER BY date DESC 
      LIMIT 60
    `, params);

    const monthly = await pool.query(`
      SELECT TO_CHAR(date::DATE, 'YYYY-MM') as month, space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY month, space 
      ORDER BY month DESC
    `, params);

    const spaceStats = await pool.query(`
      SELECT space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY space
    `, params);

    // Yearly trend
    const yearlyTrend = await pool.query(`
      SELECT TO_CHAR(date::DATE, 'MM') as month_num, space, COUNT(*) as count 
      FROM bookings 
      WHERE TO_CHAR(date::DATE, 'YYYY') = $1
      GROUP BY month_num, space 
      ORDER BY month_num ASC
    `, [year || new Date().getFullYear().toString()]);

    const topUsers = await pool.query(`
      SELECT u.name, COUNT(b.id) as count 
      FROM users u 
      JOIN bookings b ON u.id = b.user_id 
      ${dateFilter.replace('WHERE', 'AND').replace('date', 'b.date')}
      GROUP BY u.id 
      ORDER BY count DESC 
      LIMIT 10
    `, params);

    const recentBookings = await pool.query(`
      SELECT b.*, u.name as user_name 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      ${dateFilter.replace('WHERE', 'AND').replace('date', 'b.date')}
      ORDER BY b.created_at DESC 
      LIMIT 100
    `, params);

    res.json({ 
      daily: daily.rows, 
      monthly: monthly.rows, 
      spaceStats: spaceStats.rows, 
      yearlyTrend: yearlyTrend.rows, 
      topUsers: topUsers.rows, 
      recentBookings: recentBookings.rows 
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
}

setupVite();

const PORT = 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
