const { listUsers, registerUser } = require('./_lib/data');

module.exports = async (req, res) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    if (req.method === 'GET') {
      const users = await listUsers();
      return res.status(200).json(users);
    }
    if (req.method === 'POST') {
      const { email, password, name = '', role = 'user' } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const ok = await registerUser({ email, password, name, role });
      if (!ok) return res.status(500).json({ error: 'Failed to create user' });
      return res.status(201).json({ message: 'User created' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('users endpoint error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};