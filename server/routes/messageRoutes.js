const express = require('express');
const router = express.Router();
const { saveMessage, getMessagesBetweenUsers, getHistoryMessages } = require('../controllers/messageController');

// 保存消息路由
router.post('/saveMessages', saveMessage);

// 获取特定用户之间的聊天记录
router.get('/getMessages', getMessagesBetweenUsers);

// 获取历史消息路由
router.get('/messages/history', getHistoryMessages);

module.exports = router;