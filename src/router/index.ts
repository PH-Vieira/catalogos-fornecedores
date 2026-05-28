import { createRouter, createWebHistory } from 'vue-router'
import CatalogView from '@/views/CatalogView.vue'
import AdminView from '@/views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'catalog', component: CatalogView },
    { path: '/admin', name: 'admin', component: AdminView },
  ],
})

export default router
