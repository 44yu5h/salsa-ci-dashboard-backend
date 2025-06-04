import axios from 'axios';

// Make a request to the server itself to keep it alive
const pingServer = async () => {
  try {
    const port = process.env.PORT || 8080;
    const url = `http://localhost:${port}`;
    const response = await axios.get(url);
    console.log(
      `Pinged at: ${new Date().toISOString()}, response: ${response.status}`
    );
    return true;
  } catch (error) {
    console.error('Keep-alive ping failed:', error.message);
    return false;
  }
};

const startKeepAliveCron = () => {
  setTimeout(() => {
    pingServer();

    const INTERVAL = process.env.KEEP_ALIVE_INTERVAL || 10 * 60 * 1000;
    setInterval(pingServer, INTERVAL);

    console.log(
      `Keep-alive cron job scheduled (every ${INTERVAL / (60 * 1000)} minutes)`
    );
  }, 3000);
};

export default {
  pingServer,
  startKeepAliveCron,
};
