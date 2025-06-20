
import express from 'express';
import authController from '../Controllers/authController.js';

const authRouter = express.Router()

// Public routes
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);

// Authenticated routes
authRouter.post('/logout', authController.logout);
authRouter.get('/profile', authController.getProfile);
authRouter.put('/profile', authController.updateProfile);
authRouter.put('/change-password', authController.changePassword);
authRouter.get('/check-auth', authController.checkAuth);
authRouter.get('/user-info', authController.getUserInfo);
authRouter.get('/refresh-session', authController.refreshSession);
authRouter.delete('/delete-account', authController.deleteAccount);

export default authRouter;
