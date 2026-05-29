import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { ensureAuthReady } from '@/composables/useAdminAuth'

void ensureAuthReady()

createApp(App).use(router).mount('#app')
