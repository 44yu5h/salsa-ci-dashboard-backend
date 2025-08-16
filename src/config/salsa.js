import dotenv from 'dotenv';
import axios from 'axios';
import https from 'https';

dotenv.config();

const SALSA_API_BASE_URL =
  process.env.SALSA_API_BASE_URL || 'https://salsa.debian.org/api/v4';
const SALSA_PRIVATE_ACCESS_TOKEN = process.env.SALSA_PRIVATE_ACCESS_TOKEN || '';

const salsaApi = axios.create({
  baseURL: SALSA_API_BASE_URL,
  headers: {
    'PRIVATE-TOKEN': SALSA_PRIVATE_ACCESS_TOKEN,
  },
  timeout: 10000,
  httpsAgent: new https.Agent({ keepAlive: true }),
});

export default salsaApi;
