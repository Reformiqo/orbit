import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/pages/Home.vue') },
  { path: '/inbox', name: 'Inbox', component: () => import('@/pages/Inbox.vue') },
  { path: '/my-tasks', name: 'MyTasks', component: () => import('@/pages/MyTasks.vue') },
  { path: '/workspaces', name: 'Workspaces', component: () => import('@/pages/Workspaces.vue') },
  { path: '/projects', name: 'Projects', component: () => import('@/pages/Projects.vue') },
  // Full-page task detail. More specific than the generic tab route below,
  // so Vue Router matches it first.
  {
    path: '/projects/:projectId/tasks/:taskId(TASK-[^/]+)',
    name: 'TaskDetail',
    component: () => import('@/pages/TaskDetailPage.vue'),
    props: true,
  },
  {
    // Extended pattern supports /projects/:projectId/pages/:pageId.
    // The :pageId tail is optional, so the existing /projects/:projectId/tasks
    // etc. URLs keep resolving unchanged.
    path: '/projects/:projectId/:tab?/:pageId?',
    name: 'ProjectDetail',
    component: () => import('@/pages/ProjectDetail.vue'),
    props: true,
  },
  { path: '/analytics', name: 'Analytics', component: () => import('@/pages/Analytics.vue') },
]

const router = createRouter({
  history: createWebHistory('/orbit'),
  routes,
})

export default router
