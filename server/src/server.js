require('dotenv').config();
const app=require('./app');
const connectDB=require('./config/db');
const port=Number(process.env.PORT||5000);
(async()=>{try{await connectDB();app.listen(port,()=>console.log(`API listening on port ${port}`));}catch(e){console.error(`Startup failed: ${e.message}`);process.exit(1);}})();
