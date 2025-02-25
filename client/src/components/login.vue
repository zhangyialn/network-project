<!-- 登录组件 -->
<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import 'element-plus/dist/index.css';
import axios from 'axios';
import io from 'socket.io-client';

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const router = useRouter();

const login = async () => {
    if (!username.value || !password.value) {
        ElMessage.error('所有字段不能为空');
        return;
    }
    try {
        const response = await axios.post('http://47.94.197.24:3030/api/login', {
            username: username.value,
            password: password.value
        });
        console.log(response.data);
        if (response.data.success) {
            ElMessage.success('登录成功');
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));

            // 连接 Socket.IO 并发送用户上线事件
            const socket = io('http://47.94.197.24:3030');
            socket.emit('online', response.data.user.id);
            // 跳转到聊天页面
            router.push('/chat');
        } else {
            ElMessage.error('登录失败：' + response.data.message);
        }
    } catch (error) {
        console.error(error);
        ElMessage.error('登录失败');
    }
};

// 跳转到注册页面
const goToRegister = () => {
    router.push('/');
};

</script>

<template>
    <div class="login-container">
        <div class="login-box">
            <h1>登录</h1>
            <form @submit.prevent="login">
                <div class="input-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" v-model="username" @blur="validateField('username')" required />
                </div>
                <div class="input-group">
                    <label for="password">密码</label>
                    <div class="password-container">
                        <input :type="showPassword ? 'text' : 'password'" id="password" v-model="password" @blur="validateField('password')" required />
                        <span @click="showPassword = !showPassword" class="toggle-password">
                            {{ showPassword ? '🙈' : '👁️' }}
                        </span>
                    </div>
                </div>
                <button type="submit" class="login-button">登录</button>
            </form>
            <!-- 添加跳转到注册页面的链接 -->
            <div class="register-link">
                <a @click.prevent="goToRegister">未有账号？去注册</a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    color: white;
}

.login-box {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    width: 100%;
    max-width: 400px;
}

h1 {
    margin-bottom: 20px;
    text-align: center;
}

form {
    display: flex;
    flex-direction: column;
}

.input-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
}

label {
    margin-bottom: 5px;
}

input {
    padding: 10px;
    border: none;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    outline: none;
}

input::placeholder {
    color: rgba(255, 255, 255, 0.7);
}

.password-container {
    display: flex;
    align-items: center;
    position: relative;
}

.password-container input {
    flex: 1;
    padding-right: 30px;
    /* 确保输入框和图标之间有足够的空间 */
}

.toggle-password {
    position: absolute;
    right: 10px;
    cursor: pointer;
    user-select: none;
}

.login-button,
.register-button {
    padding: 10px;
    border: none;
    border-radius: 5px;
    background-color: #4caf50;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
    margin-top: 10px;
}

.login-button:hover,
.register-button:hover {
    background-color: #45a049;
}

.register-link {
    margin-top: 15px;
    text-align: center;
}

.register-link a {
    color: white;
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.3s;
}

.register-link a:hover {
    color: #ddd;
}

@media (max-width: 430px) {
    .login-box {
        padding: 15px;
        max-width: 80%;
    }

    input {
        padding: 8px;
    }

    .login-button,
    .register-button {
        padding: 8px;
    }
}
</style>