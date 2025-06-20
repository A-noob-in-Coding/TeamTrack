import pool, { testConnection } from './Config/db.js'; // Import both pool and test function
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './Routes/authRoute.js';
import teamRouter from './Routes/teamRoute.js';
import taskRouter from './Routes/taskRoute.js';
import membershipRouter from './Routes/membershipRoute.js';
import userRouter from './Routes/userRoute.js';
import './Middleware/authMiddleware.js'
// Load env vars
dotenv.config();

testConnection()

const { Pool } = pkg;
const pgSession = connectPgSimple(session);

const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-app.onrender.com', 'http://localhost:5173'] 
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  store: new pgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set true if HTTPS
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
// import authRoutes from './routes/auth.js';
// app.use('/auth', authRoutes);

app.use('/api/auth', authRouter)
app.use('/api/teams', teamRouter)
app.use('/api/tasks', taskRouter)
app.use('/api/membership', membershipRouter)
app.use('/api/user', userRouter)

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../Frontend/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dist', 'index.html'));
  });
}

// Test route
app.get('/', (req, res) => {
  res.send('Server is up! 🔥');
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
