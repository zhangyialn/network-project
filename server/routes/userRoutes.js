const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getAllUsers } = require('../controllers/userController');

// 用户注册路由
router.post('/register', registerUser);

// 用户登录路由
router.post('/login', loginUser);

// 获取所有用户路由
router.get('/users', getAllUsers);

module.exports = router;