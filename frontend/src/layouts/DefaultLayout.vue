<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { ToastContainer } from '@/components/ui'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink
          to="/"
          class="flex items-center gap-2 text-xl font-bold text-indigo-600"
        >
          <svg
            class="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span class="hidden sm:inline">AnonChat</span>
        </RouterLink>

        <nav class="flex items-center gap-1">
          <RouterLink
            to="/"
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              route.path === '/'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
          >
            Home
          </RouterLink>
          <RouterLink
            to="/history"
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              route.path === '/history'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
          >
            History
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Toast Container -->
    <ToastContainer />
  </div>
</template>
