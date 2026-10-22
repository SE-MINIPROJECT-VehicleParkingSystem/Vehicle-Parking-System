require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const port = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDB();

    app.listen(port, '0.0.0.0', () => {
      console.log(`API listening on port ${port}`);
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

startServer();
