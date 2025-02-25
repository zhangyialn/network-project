<!-- 注册组件 -->
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import axios from 'axios';

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const router = useRouter();

const register = async () => {
    if (!username.value || !password.value || !confirmPassword.value) {
        ElMessage.error('所有字段不能为空');
        return;
    }
    if (password.value !== confirmPassword.value) {
        ElMessage.error('密码和确认密码不匹配');
        return;
    }
    try {
        const response = await axios.post('http://47.94.197.24:3030/api/register', {
            username: username.value,
            password: password.value
        });
        console.log(response);
        if (response.data.success) {
            ElMessage.success('注册成功');
            router.push('/login');
        } else {
            ElMessage.error('注册失败：' + response.data.message);
        }
    } catch (error) {
        console.error(error);
        ElMessage.error('注册失败');
    }
};

// 跳转到登录页面
const goToLogin = () => {
    router.push('/login');
};
</script>

<template>
    <div class="register-container">
        <div class="register-box">
            <h1>注册</h1>
            <form @submit.prevent="register">
                <div class="input-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" v-model="username" @blur="validateField('username')" required />
                </div>
                <div class="input-group">
                    <label for="password">密码</label>
                    <div class="password-container">
                        <input :type="showPassword ? 'text' : 'password'" id="password" v-model="password"
                            @blur="validateField('password')" required />
                        <span @click="showPassword = !showPassword" class="toggle-password">
                            {{ showPassword ? '🙈' : '👁️' }}
                        </span>
                    </div>
                </div>
                <div class="input-group">
                    <label for="confirmPassword">确认密码</label>
                    <div class="password-container">
                        <input :type="showConfirmPassword ? 'text' : 'password'" id="confirmPassword"
                            v-model="confirmPassword" @blur="validateField('confirmPassword')" required />
                        <span @click="showConfirmPassword = !showConfirmPassword" class="toggle-password">
                            {{ showConfirmPassword ? '🙈' : '👁️' }}
                        </span>
                    </div>
                </div>
                <button type="submit" class="register-button">注册</button>
            </form>
            <!-- 添加跳转到登录页面的链接 -->
            <div class="login-link">
                <a @click.prevent="goToLogin">已有账号？去登录</a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.register-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    color: white;
}

.register-box {
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

.register-button {
    padding: 10px;
    border: none;
    border-radius: 5px;
    background-color: #4caf50;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
}

.register-button:hover {
    background-color: #45a049;
}

.login-link {
    margin-top: 15px;
    text-align: center;
}

.login-link a {
    color: white;
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.3s;
}

.login-link a:hover {
    color: #ddd;
}
</style>