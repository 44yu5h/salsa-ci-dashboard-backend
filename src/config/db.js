import dotenv from 'dotenv';
import mysql from 'mysql2';
import fs from 'fs';

dotenv.config();

// Create and export the database connection pool
export const pool = mysql
  .createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'test',
    ssl: {
      ca: fs.readFileSync(
        process.env.DB_CA_PATH || '/etc/ssl/certs/ca-certificates.crt'
      ),
    },
  })
  .promise();
