import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css' // 引入 Tailwind 和全局样式
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')