const { Message, User, FileTransfer } = require('../models');
const { Op } = require('sequelize');

// 保存消息控制器
exports.saveMessage = async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  try {
    const newMessage = await Message.create({ sender_id, receiver_id, content, is_read: false });
    const messageWithUser = await Message.findOne({
      where: { id: newMessage.id },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username'] },
        { model: User, as: 'receiver', attributes: ['id', 'username'] }
      ]
    });
    res.json({ success: true, message: messageWithUser });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 获取历史消息
exports.getHistoryMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [
        { model: User, as: 'sender', attributes: ['username'] },
        { model: User, as: 'receiver', attributes: ['username'] }
      ],
      order: [['timestamp', 'ASC']]
    });
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching history messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 标记消息为已读
exports.markMessagesAsRead = async (userId) => {
  try {
    await Message.update({ is_read: true }, { where: { receiver_id: userId, is_read: false } });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// 获取特定用户之间的聊天记录，包括文件信息
exports.getMessagesBetweenUsers = async (req, res) => {
  const { sender_id, receiver_id } = req.query;
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id, receiver_id },
          { sender_id: receiver_id, receiver_id: sender_id }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username'] },
        { model: User, as: 'receiver', attributes: ['id', 'username'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    const files = await FileTransfer.findAll({
      where: {
        [Op.or]: [
          { sender_id, receiver_id },
          { sender_id: receiver_id, receiver_id: sender_id }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username'] },
        { model: User, as: 'receiver', attributes: ['id', 'username'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    // 合并消息和文件信息，并按时间排序
    const combinedData = [...messages, ...files].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({ success: true, messages: combinedData });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};