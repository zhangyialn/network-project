const express = require('express');
const router = express.Router();
const { uploadFile, downloadFile, getUploadStatus, togglePause } = require('../controllers/fileController');

// 文件上传路由
router.post('/upload', uploadFile);

// 文件下载路由
router.get('/download/:fileName', downloadFile);

// 获取文件上传状态
router.get('/upload/status', getUploadStatus);

// 暂停或继续文件传输
router.post('/upload/togglePause', togglePause);

module.exports = router;