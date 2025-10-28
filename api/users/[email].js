const { getUser, updateUser, deleteUser } = require('../_lib/data');

module.exports = async (req, res) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { email } = req.query;
  try {
    if (req.method === 'GET') {
      const user = await getUser(email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(user);
    }
    if (req.method === 'PUT') {
      const updates = req.body || {};
      const result = await updateUser(email, updates);
      if (!result) return res.status(404).json({ error: 'User not found or no changes' });
      return res.status(200).json({ message: 'User updated', user: result });
    }
    if (req.method === 'DELETE') {
      const ok = await deleteUser(email);
      if (!ok) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ message: 'User deleted' });
    }
    res.setHeader('Allow','GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('user by email endpoint error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};