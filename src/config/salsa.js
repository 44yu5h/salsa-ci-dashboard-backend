import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const SALSA_API_BASE_URL =
  process.env.SALSA_API_BASE_URL || 'https://salsa.debian.org/api/v4';
const SALSA_PRIVATE_ACCESS_TOKEN = process.env.SALSA_PRIVATE_ACCESS_TOKEN || '';

const salsaApi = axios.create({
  baseURL: SALSA_API_BASE_URL,
  headers: {
    'PRIVATE-TOKEN': SALSA_PRIVATE_ACCESS_TOKEN,
  },
});

export default salsaApi;
