const { User } = require('../models');

// 用户注册控制器
exports.registerUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // 检查用户名是否已存在
    console.log(111);
    console.log(username);
    const existingUser = await User.findOne({ where: { username } });
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 创建新用户
    console.log('111');
    console.log(username, password);
    const user = await User.create({ username, password });
    console.log(user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 用户登录控制器
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // 查找用户
    const user = await User.findOne({ where: { username, password } });
    if (user) {
      // 更新最后登录时间和在线状态
      user.last_login_time = new Date();
      user.status = 'online';
      await user.save();
      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: '用户名或密码错误' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 获取所有用户
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};