import { createRouter, createWebHistory } from 'vue-router'
import { HomeView, ChatView, HistoryView } from '@/views'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'AnonChat - Anonymous Chat',
      },
    },
    {
      path: '/room/:roomCode',
      name: 'chat',
      component: ChatView,
      meta: {
        title: 'Chat Room - AnonChat',
      },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: {
        title: 'Chat History - AnonChat',
      },
    },
    {
      // Catch-all redirect to home
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Update document title on route change
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'AnonChat'
  next()
})

export default router
