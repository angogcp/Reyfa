const { Pool } = require('pg');

let pool = null;
try {
  // Create a connection pool if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });
  }
} catch (error) {
  console.error('Failed to connect to Neon database:', error);
  pool = null;
}

const storage = require('./storage');

// Detect KV availability (optional)
function hasKv() {
  try {
    // If the package is installed and env vars exist, consider KV available
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REST_URL || process.env.KV_URL || '';
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REST_TOKEN || '';
    return Boolean(kvUrl && kvToken);
  } catch (_) {
    return false;
  }
}

// Check if we have a database connection
function hasDb() {
  return Boolean(pool && process.env.DATABASE_URL);
}

// Initialize database tables if they don't exist
async function initDb() {
  if (!hasDb()) return false;
  
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
    
    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT
      )
    `);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    return false;
  }
}

// Users
async function getUser(email) {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Seed from storage if present
      const fallback = storage.readData('users.json').find(u => u.email === email) || null;
      if (fallback) {
        await pool.query(
          'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
          [fallback.email, fallback.password, fallback.name, fallback.role]
        );
      }
      return fallback;
    } catch (error) {
      console.error('Database error in getUser:', error);
    }
  }
  
  const users = storage.readData('users.json');
  return users.find(u => u.email === email) || null;
}

async function registerUser(user) {
  if (hasDb()) {
    try {
      await initDb();
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        [user.email, user.password, user.name, user.role]
      );
      return true;
    } catch (error) {
      console.error('Database error in registerUser:', error);
      return false;
    }
  }
  
  const users = storage.readData('users.json');
  users.push(user);
  storage.writeData('users.json', users);
  return true;
}

async function listUsers() {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('SELECT * FROM users');
      if (result.rows.length > 0) return result.rows;
      const fallback = storage.readData('users.json');
      // Seed DB if empty
      for (const u of fallback) {
        await pool.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING', [u.email, u.password, u.name, u.role]);
      }
      return fallback;
    } catch (error) {
      console.error('Database error in listUsers:', error);
      return [];
    }
  }
  return storage.readData('users.json');
}

async function updateUser(email, updates) {
  const allowedFields = ['password','name','role'];
  if (hasDb()) {
    try {
      await initDb();
      const setClauses = [];
      const values = [];
      let i = 1;
      for (const f of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updates, f)) {
          setClauses.push(`${f} = $${i}`);
          values.push(updates[f]);
          i++;
        }
      }
      if (setClauses.length === 0) return false;
      values.push(email);
      const query = `UPDATE users SET ${setClauses.join(', ')} WHERE email = $${i} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rowCount > 0 ? result.rows[0] : false;
    } catch (error) {
      console.error('Database error in updateUser:', error);
      return false;
    }
  }
  const users = storage.readData('users.json');
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return false;
  allowedFields.forEach(f => {
    if (Object.prototype.hasOwnProperty.call(updates, f)) {
      users[idx][f] = updates[f];
    }
  });
  storage.writeData('users.json', users);
  return users[idx];
}

async function deleteUser(email) {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('DELETE FROM users WHERE email = $1', [email]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Database error in deleteUser:', error);
      return false;
    }
  }
  let users = storage.readData('users.json');
  const before = users.length;
  users = users.filter(u => u.email !== email);
  storage.writeData('users.json', users);
  return users.length < before;
}

// Bookings
async function listBookings() {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('SELECT * FROM bookings');
      
      if (result.rows.length > 0) {
        return result.rows;
      }
      
      // Seed from storage if DB is empty
      const fallback = storage.readData('bookings.json');
      if (fallback.length > 0) {
        for (const booking of fallback) {
          await pool.query(
            'INSERT INTO bookings (id, name, email, phone, address, service, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [booking.id, booking.name, booking.email, booking.phone, booking.address, booking.service, booking.date, booking.time, booking.status, booking.notes || '']
          );
        }
      }
      return fallback;
    } catch (error) {
      console.error('Database error in listBookings:', error);
    }
  }
  
  return storage.readData('bookings.json');
}

async function addBooking(booking) {
  if (hasDb()) {
    try {
      await initDb();
      await pool.query(
        'INSERT INTO bookings (id, name, email, phone, address, service, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [booking.id, booking.name, booking.email, booking.phone, booking.address, booking.service, booking.date, booking.time, booking.status, booking.notes || '']
      );
      return true;
    } catch (error) {
      console.error('Database error in addBooking:', error);
      return false;
    }
  }
  
  const bookings = storage.readData('bookings.json');
  bookings.push(booking);
  storage.writeData('bookings.json', bookings);
  return true;
}

async function getBookingById(id) {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database error in getBookingById:', error);
      return null;
    }
  }
  const bookings = storage.readData('bookings.json');
  return bookings.find(b => b.id === id) || null;
}

async function updateBookingStatus(id, status) {
  if (hasDb()) {
    try {
      await initDb();
      const result = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Database error in updateBookingStatus:', error);
      return false;
    }
  }
  
  const bookings = storage.readData('bookings.json');
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return false;
  bookings[idx].status = status;
  storage.writeData('bookings.json', bookings);
  return true;
}

async function updateBookingDetails(id, updates) {
  const allowedFields = ['bookingDate','bookingTime','area','streetAddress','postcode','fullName','phoneNumber','notes','serviceType','hours','homeSize','status'];

  if (hasDb()) {
    try {
      await initDb();
      const setClauses = [];
      const values = [];
      let i = 1;
      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          setClauses.push(`${field} = $${i}`);
          values.push(updates[field]);
          i++;
        }
      }
      if (setClauses.length === 0) return false;
      values.push(id);
      const query = `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rowCount > 0 ? result.rows[0] : false;
    } catch (error) {
      console.error('Database error in updateBookingDetails:', error);
      return false;
    }
  }

  const bookings = storage.readData('bookings.json');
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return false;
  allowedFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      bookings[idx][field] = updates[field];
    }
  });
  storage.writeData('bookings.json', bookings);
  return bookings[idx];
}

module.exports = {
  hasDb,
  hasKv,
  initDb,
  getUser,
  registerUser,
  listUsers,
  updateUser,
  deleteUser,
  listBookings,
  addBooking,
  getBookingById,
  updateBookingStatus,
  updateBookingDetails,
};