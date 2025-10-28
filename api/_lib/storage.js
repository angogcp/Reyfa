const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = os.tmpdir();

function tmpPath(filename) {
  return path.join(tmpDir, filename);
}

function rootPath(filename) {
  return path.join(process.cwd(), filename);
}

function readData(filename) {
  const t = tmpPath(filename);
  if (fs.existsSync(t)) {
    try {
      const data = fs.readFileSync(t, 'utf8');
      return JSON.parse(data || '[]');
    } catch (e) {
      return [];
    }
  }
  // Try reading from project root
  try {
    const data = fs.readFileSync(rootPath(filename), 'utf8');
    return JSON.parse(data || '[]');
  } catch (e) {
    // Fallback: try relative to this library (useful in serverless bundlers)
    try {
      const alt = path.join(__dirname, '../../', filename);
      const data = fs.readFileSync(alt, 'utf8');
      return JSON.parse(data || '[]');
    } catch (e2) {
      // Final fallback: return defaults for known files
      if (filename === 'users.json') {
        return [
          { email: 'admin@cleanhome.ipoh', password: 'admin123', name: 'Admin', role: 'admin' },
          { email: 'owner@cleanhome.ipoh', password: 'clean2024', name: 'Owner', role: 'admin' }
        ];
      }
      return [];
    }
  }
}

function writeData(filename, data) {
  try {
    fs.writeFileSync(tmpPath(filename), JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { readData, writeData };