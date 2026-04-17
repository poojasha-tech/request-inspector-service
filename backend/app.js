import express from 'express';
import cors from 'cors';
import api from './api.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({limit:'10mb'})); // Middleware to parse JSON bodies. This will allow us to access req.body for JSON payloads.
app.use(express.urlencoded({ extended: true , limit:'10mb' })); // Middleware to parse URL-encoded data
app.use(express.text({ type: 'text/*' , limit:'10mb' })); // Middleware to parse text/plain content types
app.use('/api', api);


app.set('timeout', 30 * 1000); // for normal APIs


// Sample route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});
app.get('/page', (req, res) => {res.send("<h1>Hello</h1>")})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;