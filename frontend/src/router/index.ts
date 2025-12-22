import { createRouter, createWebHistory } from 'vue-router'
import { HomeView} from '@/views'

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
    // {
    //   path: '/chat/:roomCode',
    //   name: 'chat',
    //   component: ChatView,
    //   meta: {
    //     title: 'AnonChat - Chat Room',
    //   },
    // },
    // {
    //   path: '/history',
    //   name: 'history',
    //   component: HistoryView,
    //   meta: {
    //     title: 'AnonChat - Chat History',
    //   },
    // },
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
