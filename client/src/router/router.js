import { createRouter, createWebHashHistory } from 'vue-router';
import Register from '../components/register.vue';
import Login from '../components/login.vue';
import chat from '../components/chat.vue';

const routes = [
    { path: '/', component: Register },
    { path: '/login', component: Login },
    { path: '/chat', component: chat },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;