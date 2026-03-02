import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("smartbook.db");

// Handle BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'teacher'
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    space TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    class TEXT NOT NULL,
    purpose TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Admin if not exists
const admin = db.prepare("SELECT * FROM users WHERE email = ?").get("GPM_SKLT");
if (!admin) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Admin PSS",
    "GPM_SKLT",
    "GPMsklt2025",
    "admin"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      const { password, ...userWithoutPassword } = user as any;
      res.json({ user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;
    console.log(`Registering user: ${email}`);
    try {
      const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
        name,
        email,
        password,
        "teacher"
      );
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      console.log(`User registered successfully: ${email}`);
      res.json({ user });
    } catch (error: any) {
      console.error(`Registration error for ${email}:`, error);
      res.status(400).json({ error: "Email already exists" });
    }
  });

  // Booking Routes
  app.get("/api/bookings", (req, res) => {
    const { date, space } = req.query;
    const bookings = db.prepare(`
      SELECT b.*, u.name as user_name 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      WHERE b.date = ? AND b.space = ?
    `).all(date, space);
    res.json(bookings);
  });

  app.get("/api/bookings/history/:userId", (req, res) => {
    const { userId } = req.params;
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE user_id = ? 
      ORDER BY date DESC, time DESC
    `).all(userId);
    res.json(bookings);
  });

  app.post("/api/bookings", (req, res) => {
    const { user_id, space, date, time, class: className, purpose } = req.body;
    
    // Check for existing booking
    const existing = db.prepare("SELECT * FROM bookings WHERE date = ? AND time = ? AND space = ?").get(date, time, space);
    if (existing) {
      return res.status(400).json({ error: "Slot already booked" });
    }

    try {
      db.prepare("INSERT INTO bookings (user_id, space, date, time, class, purpose) VALUES (?, ?, ?, ?, ?, ?)").run(
        user_id,
        space,
        date,
        time,
        className,
        purpose
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.delete("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", (req, res) => {
    const { month, year } = req.query;
    
    let dateFilter = "";
    let params: any[] = [];
    
    if (month && year) {
      dateFilter = "WHERE strftime('%Y-%m', date) = ?";
      params = [`${year}-${month.toString().padStart(2, '0')}`];
    } else if (year) {
      dateFilter = "WHERE strftime('%Y', date) = ?";
      params = [year];
    }

    const daily = db.prepare(`
      SELECT date, space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY date, space 
      ORDER BY date DESC 
      LIMIT 60
    `).all(...params);

    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY month, space 
      ORDER BY month DESC
    `).all(...params);

    const spaceStats = db.prepare(`
      SELECT space, COUNT(*) as count 
      FROM bookings 
      ${dateFilter}
      GROUP BY space
    `).all(...params);

    // Yearly trend (all months in the selected year)
    const yearlyTrend = db.prepare(`
      SELECT strftime('%m', date) as month_num, space, COUNT(*) as count 
      FROM bookings 
      WHERE strftime('%Y', date) = ?
      GROUP BY month_num, space 
      ORDER BY month_num ASC
    `).all(year || new Date().getFullYear().toString());

    const topUsers = db.prepare(`
      SELECT u.name, COUNT(b.id) as count 
      FROM users u 
      JOIN bookings b ON u.id = b.user_id 
      ${dateFilter.replace('WHERE', 'AND').replace('date', 'b.date')}
      GROUP BY u.id 
      ORDER BY count DESC 
      LIMIT 10
    `).all(...params);

    const recentBookings = db.prepare(`
      SELECT b.*, u.name as user_name 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      ${dateFilter.replace('WHERE', 'AND').replace('date', 'b.date')}
      ORDER BY b.created_at DESC 
      LIMIT 100
    `).all(...params);

    res.json({ daily, monthly, spaceStats, yearlyTrend, topUsers, recentBookings });
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
