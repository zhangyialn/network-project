const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { User, Message, FileTransfer } = require('./models');

const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true
}));
app.use('/api', userRoutes);
app.use('/api', messageRoutes);
app.use('/api', fileRoutes);

io.on('connection', (socket) => {
  console.log('用户已连接');

  // 用户上线
  socket.on('online', async (userId) => {
    try {
      const user = await User.findByPk(userId);
      user.status = 'online';
      await user.save();
      socket.join(`user_${userId}`); // 将用户加入特定的房间
      io.emit('userStatusUpdate', { id: userId, status: 'online' });
    } catch (error) {
      console.error(error);
    }
  });

  // 用户下线
  socket.on('offline', async (userId) => {
    try {
      const user = await User.findByPk(userId);
      user.status = 'offline';
      await user.save();
      socket.leave(`user_${userId}`); // 将用户从房间移除
      io.emit('userStatusUpdate', { id: userId, status: 'offline' });
    } catch (error) {
      console.error(error);
    }
  });

  // 用户发送消息
  socket.on('sendMessage', async (message) => {
    try {
      // 确保只在这里保存消息到数据库
      const savedMessage = await Message.create(message);

      // 发送消息给接收用户
      io.to(`user_${message.receiver_id}`).emit('newMessage', savedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // 文件传输完成
  socket.on('fileTransferComplete', async (fileInfo) => {
    try {
      // 更新文件传输状态到数据库
      await FileTransfer.update(
        { transfer_status: 'completed', progress: 100 },
        { where: { id: fileInfo.id } }
      );

      // 发送文件传输更新给接收用户
      io.to(`user_${fileInfo.receiver_id}`).emit('fileTransferUpdate', fileInfo);
    } catch (error) {
      console.error('Error updating file transfer:', error);
    }
  });
});

// 在用户注册成功后
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const newUser = await User.create({ username, password });

    // 广播用户更新事件
    io.emit('userListUpdate');

    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

server.listen(3030, () => {
  console.log('服务器运行在 http://localhost:3030');
});