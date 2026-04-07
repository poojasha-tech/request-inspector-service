import express from 'express';
import cors from 'cors';
import api from './backend/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({limit:'10mb'})); // Middleware to parse JSON bodies. This will allow us to access req.body for JSON payloads.
app.use(express.urlencoded({ extended: true , limit:'10mb' })); // Middleware to parse URL-encoded data
app.use(express.text({ type: 'text/*' , limit:'10mb' })); // Middleware to parse text/plain content types
app.use('/api', api);


app.set('timeout', 30 * 1000); // for normal APIs
//lon timeout for SSE routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/stream/')) {
        res.setTimeout(0); // Disable timeout for SSE
    }
    next();
});

// Sample route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.get('/api/health',(req,res)=>{
    //res.json({status:'ok'})
    res.status(200).json({
        status:'ok',
        uptime: process.uptime(), // it will return the uptime of the server in seconds
        timestamp: Date.now()   // it will return the current timestamp in milliseconds
    })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;