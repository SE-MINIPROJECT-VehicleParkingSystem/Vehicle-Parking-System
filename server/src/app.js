const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const authRoutes=require('./routes/authRoutes');
const {sendSuccess,sendError}=require('./utils/apiResponse');
const app=express();
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));
app.use(express.json({limit:'20kb'}));
app.get('/api/health',(_req,res)=>sendSuccess(res,'API is running.',{service:'vehicle-parking-api'}));
app.use('/api/auth',authRoutes);
app.use((_req,res)=>sendError(res,'Route not found.',404));
app.use((err,_req,res,_next)=>{
  if(err&&err.type==='entity.parse.failed')return sendError(res,'Request body must be valid JSON.',400);
  if(err&&err.name==='ValidationError')return sendError(res,'Submitted data failed validation.',400);
  if(err&&err.code===11000)return sendError(res,'A record with that unique value already exists.',409);
  console.error(err);return sendError(res,'Internal server error.',500);
});
module.exports=app;
