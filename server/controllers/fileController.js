const fs = require('fs');
const path = require('path');
const { FileTransfer } = require('../models');
const { log } = require('console');

exports.uploadFile = async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('没有文件上传');
  }

  const file = req.files.file;
  const decodedFileName = decodeURIComponent(file.name);
  const uploadDir = path.join(__dirname, '../uploads/');
  const uploadPath = path.join(uploadDir, decodedFileName);
  const start = parseInt(req.body.start, 10);

  // 检查并创建上传目录
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 检查是否暂停
  const { sender_id, receiver_id } = req.body;
  const fileTransfer = await FileTransfer.findOne({
    where: { sender_id, receiver_id, file_name: decodedFileName }
  });

  if (fileTransfer && fileTransfer.is_paused) {
    return res.json({ success: false, message: '文件传输已暂停' });
  }

  // 以追加模式打开文件
  const writeStream = fs.createWriteStream(uploadPath, { flags: 'a', start });

  writeStream.on('error', (err) => {
    console.error('Error writing file:', err);
    return res.status(500).send(err);
  });

  writeStream.on('finish', async () => {
    if (fileTransfer) {
      const newProgress = Math.round((start + file.size) * 100 / file.size);
      fileTransfer.progress = newProgress > 100 ? 100 : newProgress;
      if (fileTransfer.progress === 100) {
        fileTransfer.transfer_status = 'completed';
      }
      await fileTransfer.save();
    } else {
      await FileTransfer.create({
        sender_id,
        receiver_id,
        file_name: decodedFileName,
        file_size: file.size,
        transfer_status: 'in_progress',
        progress: Math.round((start + file.size) * 100 / file.size)
      });
    }

    res.json({ success: true, progress: fileTransfer ? fileTransfer.progress : 0 });
  });

  // 将 Buffer 写入文件
  writeStream.write(file.data, (err) => {
    if (err) {
      console.error('Error writing buffer to file:', err);
      return res.status(500).send(err);
    }
    writeStream.end();
  });
};

exports.downloadFile = async (req, res) => {
  const { fileName } = req.params;
  const decodedFileName = decodeURIComponent(fileName);
  const filePath = path.join(__dirname, '../uploads/', decodedFileName);
  res.download(filePath, decodedFileName, (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
};

// 获取文件上传状态
exports.getUploadStatus = async (req, res) => {
  const { fileName, sender_id, receiver_id } = req.query;
  try {
    const fileTransfer = await FileTransfer.findOne({
      where: { sender_id, receiver_id, file_name: decodeURIComponent(fileName) }
    });

    if (fileTransfer) {
      res.json({ uploadedBytes: fileTransfer.progress * fileTransfer.file_size / 100 });
    } else {
      res.json({ uploadedBytes: 0 });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.togglePause = async (req, res) => {
  const { fileName, sender_id, receiver_id } = req.body;
  try {
    const fileTransfer = await FileTransfer.findOne({
      where: { sender_id, receiver_id, file_name: decodeURIComponent(fileName) }
    });

    if (fileTransfer) {
      fileTransfer.is_paused = !fileTransfer.is_paused;
      await fileTransfer.save();
      res.json({ success: true, is_paused: fileTransfer.is_paused });
    } else {
      res.status(404).json({ success: false, message: '文件传输记录未找到' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};