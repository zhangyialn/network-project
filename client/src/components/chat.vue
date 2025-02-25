<script setup>
import { ref, onMounted, onUnmounted, onUpdated } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';
import { useRouter } from 'vue-router';

const currentUser = ref(null);
const users = ref([]);
const selectedUser = ref(null);
const messages = ref([]);
const newMessage = ref('');
const socket = ref(null);
const router = useRouter();
const showOptions = ref(false);
const showHistoryModal = ref(false);
const historyMessages = ref([]);
const uploadProgress = ref(0);
const fileProgress = ref({}); // 使用对象存储每个文件的上传进度
const isPaused = ref(false); // 定义为响应式变量

const fetchUsers = async () => {
  try {
    const response = await axios.get('http://47.94.197.24:3030/api/users');
    users.value = response.data.users;
  } catch (error) {
    console.error(error);
    ElMessage.error('获取用户列表失败');
  }
};

const fetchMessages = async (userId) => {
  try {
    const response = await axios.get(`http://47.94.197.24:3030/api/getMessages`, {
      params: {
        sender_id: currentUser.value.id,
        receiver_id: userId
      }
    });
    messages.value = response.data.messages;
    console.log(messages.value);
    scrollToBottom();
    console.log('scrollToBottom');
  } catch (error) {
    console.error(error);
  }
};

const selectUser = (user) => {
  selectedUser.value = user;
  fetchMessages(user.id);
  console.log(currentUser.value.id);
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  try {
    const message = {
      sender_id: currentUser.value.id,
      receiver_id: selectedUser.value.id,
      content: newMessage.value,
      sender: {
        id: currentUser.value.id,
        username: currentUser.value.username
      }
    };

    // 通过 WebSocket 发送消息
    socket.value.emit('sendMessage', message);
    console.log(message);
    // 立即更新本地消息列表
    messages.value.push(message);
    newMessage.value = '';
    scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
    ElMessage.error('发送消息失败');
  }
};

const setupSocket = () => {
  socket.value = io('http://47.94.197.24:3030');

  socket.value.on('connect', () => {
    console.log('Connected to WebSocket server');
    socket.value.emit('online', currentUser.value.id);
  });

  socket.value.on('userStatusUpdate', (updatedUser) => {
    const user = users.value.find(u => u.id === updatedUser.id);
    if (user) {
      user.status = updatedUser.status;
    }
  });

  socket.value.on('userListUpdate', async () => {
    await fetchUsers(); // 重新获取用户列表
  });

  socket.value.on('uploadProgress', (data) => {
    if (data.receiver_id === selectedUser.value.id) {
      uploadProgress.value = data.progress;
    }
  });

  // 监听新消息事件
  socket.value.on('newMessage', (message) => {
    if (message.receiver_id === currentUser.value.id) {
      // 确保消息中包含发送者信息
      console.log(message);
      const sender = users.value.find(u => u.id === message.sender.id);
      if (sender) {
        message.sender.username = sender.username;
      } else {
        message.sender.username = '未知用户';
      }
      messages.value.push(message);
      scrollToBottom();
    }
  });

  // 监听文件传输更新事件
  socket.value.on('fileTransferUpdate', async (fileInfo) => {
    if (fileInfo.receiver_id === currentUser.value.id) {
      await fetchMessages(selectedUser.value.id); // 重新获取消息列表
    }
  });

  // 监听文件传输完成事件
  socket.value.on('fileTransferComplete', async (fileInfo) => {
    if (fileInfo.receiver_id === currentUser.value.id) {
      await fetchMessages(selectedUser.value.id); // 重新获取消息列表
    }
  });

  socket.value.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString(); // 86400000ms = 1 day

  if (isToday) {
    return date.toLocaleString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return `昨天 ${date.toLocaleString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }
};

const shouldShowTimestamp = (index) => {
  if (index === 0) return true;
  const currentMessageTime = new Date(messages.value[index].timestamp);
  const previousMessageTime = new Date(messages.value[index - 1].timestamp);
  const timeDifference = (currentMessageTime - previousMessageTime) / 1000 / 60; // 转换为分钟
  return timeDifference >= 1;
};

const toggleOptions = () => {
  showOptions.value = !showOptions.value;
};

const showHistory = async () => {
  try {
    const response = await axios.get('http://47.94.197.24:3030/api/messages/history');
    historyMessages.value = response.data.messages;
    showHistoryModal.value = true;
    scrollToBottom();
  } catch (error) {
    console.error(error);
    ElMessage.error('获取历史记录失败');
  }
};

const closeHistory = () => {
  showHistoryModal.value = false;
};

const uploadFile = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  console.log(file);

  const fileName = encodeURIComponent(file.name);
  const chunkSize = 1024 * 1024; // 1MB
  let start = 0;
  let isPaused = false;

  // 检查是否有未完成的上传
  const existingUpload = await axios.get(`http://47.94.197.24:3030/api/upload/status`, {
    params: {
      fileName: fileName,
      sender_id: currentUser.value.id,
      receiver_id: selectedUser.value.id
    }
  });

  if (existingUpload.data && existingUpload.data.uploadedBytes) {
    start = existingUpload.data.uploadedBytes;
  }

  // 添加初始消息记录
  const messageId = Date.now(); // 使用时间戳作为临时ID
  messages.value.push({
    id: messageId,
    sender_id: currentUser.value.id,
    receiver_id: selectedUser.value.id,
    content: `文件: ${decodeURIComponent(fileName)}`,
    timestamp: new Date(),
    file_name: decodeURIComponent(fileName),
    progress: 0, // 初始进度为0
    is_paused: false // 初始状态为未暂停
  });

  while (start < file.size) {
    if (isPaused) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }

    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk, fileName);
    formData.append('sender_id', currentUser.value.id);
    formData.append('receiver_id', selectedUser.value.id);
    formData.append('start', start);

    try {
      const response = await axios.post('http://47.94.197.24:3030/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(((start + progressEvent.loaded) * 100) / file.size);
          fileProgress.value[fileName] = progress > 100 ? 100 : progress; // 更新特定文件的进度
          console.log(fileProgress.value[fileName]);
          socket.value.emit('uploadProgress', {
            receiver_id: selectedUser.value.id,
            fileName: fileName,
            progress: fileProgress.value[fileName]
          });

          // 更新消息记录中的进度
          const messageIndex = messages.value.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            messages.value[messageIndex].progress = fileProgress.value[fileName];
          }
        }
      });

      if (response.data.success) {
        start = end; // 更新已上传的字节数
      } else {
        ElMessage.error('文件上传失败');
        break;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      ElMessage.error('文件上传失败');
      break;
    }
  }

  if (start === file.size) {
    ElMessage.success('文件上传成功');
    // 上传完成后更新用户信息
    await fetchMessages(selectedUser.value.id);
    socket.value.emit('fileTransferComplete', {
      sender_id: currentUser.value.id,
      receiver_id: selectedUser.value.id,
      file_name: decodeURIComponent(fileName)
    });
  }
};

const toggleFileTransfer = async (fileName) => {
  const messageIndex = messages.value.findIndex(msg => msg.file_name === fileName && msg.sender_id === currentUser.value.id);
  if (messageIndex !== -1) {
    const message = messages.value[messageIndex];
    message.is_paused = !message.is_paused;
    isPaused.value = message.is_paused;
    ElMessage.success(message.is_paused ? '文件传输已暂停' : '文件传输已继续');
  }
};

const downloadFile = (fileName) => {
  const encodedFileName = encodeURIComponent(fileName);
  window.open(`http://47.94.197.24:3030/api/download/${encodedFileName}`, '_blank');
};

const handleFileClick = (message) => {
  if (message.sender_id === currentUser.value.id && message.progress < 100) {
    console.log(111);
    toggleFileTransfer(message.file_name);
  } else if (message.progress >= 100 && message.receiver_id === currentUser.value.id) {
    downloadFile(message.file_name);
    console.log(222);
  }
};

const scrollToBottom = () => {
  const chatBox = document.querySelector('.messages');
  if (chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

onMounted(async () => {
  const storedUser = localStorage.getItem('currentUser');
  if (!storedUser) {
    ElMessage.warning('请先登录以访问聊天页面');
    router.push('/login');
    return;
  }
  currentUser.value = JSON.parse(storedUser);
  await fetchUsers();
  setupSocket();

  window.addEventListener('beforeunload', () => {
    if (socket.value) {
      socket.value.emit('offline', currentUser.value.id);
    }
  });
});

onUpdated(() => {
  scrollToBottom(); // 在组件更新后滚动到底部
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<template>
  <div class="chat-container">
    <div class="user-list">
      <h2>用户列表</h2>
      <ul>
        <li v-for="user in users" :key="user.id"
            :class="{ online: user.status === 'online', offline: user.status === 'offline' }"
            @click="selectUser(user)">
          <img src="../assets/OIP-C.jpg" :alt="user.username" class="avatar" />
          <span>{{ user.id === currentUser.id ? `我 (${user.username})` : user.username }}</span>
          <span class="status-indicator" :class="user.status"></span>
        </li>
      </ul>
    </div>
    <div :class="['chat-box', { active: selectedUser }]">
      <div class="chat-header">
        <h2 v-if="selectedUser">与 {{ selectedUser.id === currentUser.id ? `我 (${selectedUser.username})` : selectedUser.username }} 的聊天</h2>
        <button v-if="selectedUser" class="options-button" @click="toggleOptions">...</button>
        <div v-if="showOptions" class="options-menu">
          <button @click="showHistory">查询历史聊天记录</button>
        </div>
      </div>
      <div class="messages" v-if="selectedUser">
        <div v-for="(message, index) in messages" :key="message.id"
            :class="{ 'my-message': message.sender_id === currentUser.id, 'their-message': message.sender_id !== currentUser.id }">
          <div v-if="shouldShowTimestamp(index)" class="timestamp">{{ formatTimestamp(message.timestamp) }}</div>
          <div class="message-wrapper" 
               :class="{ 'justify-end': message.sender_id === currentUser.id, 'justify-start': message.sender_id !== currentUser.id }"
               @click="message.file_name ? handleFileClick(message) : null">
            <div class="username" :class="{ 'right': message.sender_id === currentUser.id, 'left': message.sender_id !== currentUser.id }">
              {{ message.sender ? message.sender.username : '未知用户' }}
            </div>
            <div class="message-content" v-if="message.file_name">
              <div>{{ `文件: ${message.file_name}` }}</div>
              <div>进度: {{ fileProgress[message.file_name] !== undefined ? fileProgress[message.file_name] : message.progress }}%</div>
              <div v-if="message.progress < 100">
                <a @click.stop="toggleFileTransfer(message.file_name)">
                  {{ message.sender_id === currentUser.id ? (message.is_paused ? '继续上传' : '暂停上传') : '' }}
                </a>
              </div>
              <div v-if="currentUser.id === message.receiver_id && message.progress >= 100">
                <a @click.stop="downloadFile(message.file_name)">下载文件</a>
              </div>
              <div v-if="currentUser.id === message.sender_id && message.progress >= 100">
                <span>传输完成</span>
              </div>
            </div>
            <div class="message-content" v-else>
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>
      <div class="input-box" v-if="selectedUser">
        <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="输入消息..." />
        <button @click="sendMessage">发送</button>
        <input type="file" id="file-upload" @change="uploadFile" style="display: none;" />
        <label for="file-upload" class="file-upload-button">📎</label>
      </div>
    </div>
    <div v-if="showHistoryModal" class="history-modal">
      <h3>历史聊天记录</h3>
      <div class="history-messages">
        <div v-for="message in historyMessages" :key="message.id">
          <div class="timestamp">{{ formatTimestamp(message.timestamp) }}</div>
          <div class="message-wrapper" :class="{ 'justify-end': message.sender_id === currentUser.id, 'justify-start': message.sender_id !== currentUser.id }">
            <div class="username" :class="{ 'right': message.sender_id === currentUser.id, 'left': message.sender_id !== currentUser.id }">
              {{ message.sender ? message.sender.username : '未知用户' }}
            </div>
            <div class="message-content">
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>
      <button @click="closeHistory">关闭</button>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
}

.user-list {
  width: 25%;
  background: rgba(255, 255, 255, 0.2);
  overflow-y: auto;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
}

.user-list h2 {
  padding-left: 15px;
  margin-bottom: 20px;
  color: white;
}

.user-list ul {
  list-style: none;
  padding: 0;
}

.user-list li {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  transition: background 0.3s;
  color: white;
  position: relative;
}

.user-list li:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-list .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.status-indicator.online {
  background-color: #4caf50; /* 绿色表示在线 */
}

.status-indicator.offline {
  background-color: #9e9e9e; /* 灰色表示离线 */
}

.chat-box {
  width: 75%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.options-button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.options-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.messages .my-message {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 15px;
  position: relative;
}

.messages .their-message {
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 15px;
  position: relative;
}

.message-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
}

.message-wrapper.justify-end {
  justify-content: flex-end;
}

.message-wrapper.justify-start {
  justify-content: flex-start;
}

.message-content {
  max-width: 33%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 10px;
  border-radius: 10px;
  margin: 5px;
  color: white;
}

.username {
  font-size: 12px;
  color: #ccc;
  margin-left: 10px;
  margin-right: 10px;
}

.username.right {
  order: 2;
}

.username.left {
  order: 0;
}

.timestamp {
  font-size: 12px;
  color: #ccc;
  margin-bottom: 5px; /* 将时间戳放在消息框的上方 */
  text-align: center;
  width: 100%;
}

.input-box {
  display: flex;
  align-items: center;
}

.input-box input[type="text"] {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px;
  outline: none;
}

.input-box button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-box button:hover {
  background-color: #45a049;
}

.file-upload-button {
  padding: 10px;
  border: none;
  border-radius: 5px;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 10px;
}

.file-upload-button:hover {
  background-color: #45a049;
}

.upload-progress {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.2);
  padding: 10px;
  border-radius: 5px;
  color: white;
}

.history-modal {
  width: 40%;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #6e8efb, #a777e3); /* 与聊天框背景一致 */
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 8px 60px rgba(0, 0, 0, 0.3); /* 加深阴影 */
  color: white;
  max-height: 80vh;
  overflow-y: auto;
}

.history-messages {
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 20px;
}

@media (max-width: 430px) {
  .chat-container {
    flex-direction: column;
  }

  .user-list {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  }

  .chat-box {
    width: 100%;
  }

  .input-box {
    flex-direction: column;
  }
}

</style>