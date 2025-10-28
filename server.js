const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Simple admin gate via header (demo only)
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

const usersFile = path.join(__dirname, 'users.json');
const bookingsFile = path.join(__dirname, 'bookings.json');

// Helper functions
function readJsonFile(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Register endpoint
app.post('/register', (req, res) => {
  const { email, password, role = 'user' } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let users = readJsonFile(usersFile);
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  users.push({ email, password, role });
  writeJsonFile(usersFile, users);
  res.status(201).json({ message: 'User registered successfully' });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = readJsonFile(usersFile);
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    return res.json({ message: 'Login successful', role: user.role });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Users management (local server)
console.log('Users routes active');
app.get('/users', requireAdmin, (req, res) => {
  console.log('GET /users invoked');
  const users = readJsonFile(usersFile);
  res.json(users);
});

app.post('/users', requireAdmin, (req, res) => {
  const { email, password, role = 'user', name = '' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const users = readJsonFile(usersFile);
  if (users.some(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });
  users.push({ email, password, role, name });
  writeJsonFile(usersFile, users);
  res.status(201).json({ message: 'User created' });
});

app.put('/users/:email', requireAdmin, (req, res) => {
  const email = req.params.email;
  const { role, password, name } = req.body || {};
  const users = readJsonFile(usersFile);
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (typeof role !== 'undefined') users[idx].role = role;
  if (typeof password !== 'undefined') users[idx].password = password;
  if (typeof name !== 'undefined') users[idx].name = name;
  writeJsonFile(usersFile, users);
  res.json({ message: 'User updated' });
});

app.delete('/users/:email', requireAdmin, (req, res) => {
  const email = req.params.email;
  let users = readJsonFile(usersFile);
  const before = users.length;
  users = users.filter(u => u.email !== email);
  if (users.length === before) return res.status(404).json({ error: 'User not found' });
  writeJsonFile(usersFile, users);
  res.json({ message: 'User deleted' });
});

// Bookings endpoints
app.get('/bookings', (req, res) => {
  const bookings = readJsonFile(bookingsFile);
  res.json(bookings);
});

app.post('/bookings', (req, res) => {
  const newBooking = req.body;
  
  // Validate required fields
  const requiredFields = ['serviceType', 'bookingDate', 'bookingTime', 'area', 'streetAddress', 'postcode', 'fullName', 'phoneNumber'];
  for (let field of requiredFields) {
    if (!newBooking[field]) {
      return res.status(400).json({ error: `${field} is required` });
    }
  }
  
  // Handle hourly specific fields
  if (newBooking.serviceType === 'hourly_cleaning') {
    if (!newBooking.hours || isNaN(newBooking.hours)) {
      return res.status(400).json({ error: 'Hours required for hourly cleaning and must be a number' });
    }
    // Recalculate price to verify
    newBooking.estimatedPrice = 25 * parseInt(newBooking.hours);
  } else {
    if (!newBooking.homeSize) {
      return res.status(400).json({ error: 'Home size required for non-hourly services' });
    }
    // Note: Price recalculation for other services can be added here if needed
  }
  
  newBooking.id = Date.now().toString();
  newBooking.status = 'pending';
  
  let bookings = readJsonFile(bookingsFile);
  bookings.push(newBooking);
  writeJsonFile(bookingsFile, bookings);
  res.status(201).json({ message: 'Booking created', id: newBooking.id });
});

// Fetch a single booking by id
app.get('/bookings/:id', (req, res) => {
  const id = req.params.id;
  const bookings = readJsonFile(bookingsFile);
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  return res.json(booking);
});

app.put('/bookings/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body || {};

  let bookings = readJsonFile(bookingsFile);
  const bookingIndex = bookings.findIndex(b => b.id === id);
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // If only status is provided, keep original admin flow constraints
  if (Object.keys(updates).length === 1 && typeof updates.status !== 'undefined') {
    const status = updates.status;
    if (!['accepted', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "completed"' });
    }
    bookings[bookingIndex].status = status;
    writeJsonFile(bookingsFile, bookings);
    return res.json({ message: 'Booking status updated successfully' });
  }

  // Otherwise, merge allowed booking fields for user edits
  const allowedFields = ['bookingDate','bookingTime','area','streetAddress','postcode','fullName','phoneNumber','notes','serviceType','hours','homeSize'];
  allowedFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      bookings[bookingIndex][field] = updates[field];
    }
  });
  // Optionally allow broader status values when updating details
  if (typeof updates.status !== 'undefined') {
    const validStatuses = ['pending','confirmed','in-progress','accepted','completed','cancelled'];
    if (!validStatuses.includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    bookings[bookingIndex].status = updates.status;
  }

  writeJsonFile(bookingsFile, bookings);
  res.json({ message: 'Booking updated successfully', booking: bookings[bookingIndex] });
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '.'), { etag: false, lastModified: false, maxAge: 0 }));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});