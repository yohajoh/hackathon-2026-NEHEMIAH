import express from 'express';
import cors from 'cors';

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from the ES Module Backend!',
    timestamp: new Date().toISOString(),
    items: ['Apple', 'Banana', 'Cherry', 'Date']
  });
});

export default app;
