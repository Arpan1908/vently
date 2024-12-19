const pool = require('../config/db');

const createUser = async (email, password) => {
  const result = await pool.query(
    'INSERT INTO people (email, password) VALUES ($1, $2) RETURNING id, email',
    [email, password]
  );
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM people WHERE email = $1', [email]);
  return result.rows[0];
};

module.exports = { createUser, getUserByEmail };
