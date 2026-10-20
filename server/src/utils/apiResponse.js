function sendSuccess(res,message,data=null,statusCode=200){return res.status(statusCode).json({status:'success',message,data});}
function sendError(res,message,statusCode=500,data=null){return res.status(statusCode).json({status:'error',message,data});}
module.exports={sendSuccess,sendError};
