import express from 'express';
import userController from '../Controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/profile', userController.getProfile); // GET /api/user/profile
userRouter.put('/profile', userController.updateProfile); // PUT /api/user/profile
userRouter.put('/change-password', userController.changePassword); // PUT /api/user/change-password
userRouter.delete('/delete-account', userController.deleteAccount); // DELETE /api/user/delete-account

export default userRouter; 