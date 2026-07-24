import './index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { initSocket } from './socket'
import App from './App.vue'

import {
  FrappeUI,
  Button,
  Input,
  TextInput,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  setConfig,
  frappeRequest,
  FeatherIcon,
} from 'frappe-ui'

const globalComponents = {
  Button,
  TextInput,
  Input,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  FeatherIcon,
}

const pinia = createPinia()
const app = createApp(App)

setConfig('resourceFetcher', frappeRequest)
app.use(FrappeUI)
app.use(pinia)
app.use(router)

for (const key in globalComponents) {
  app.component(key, globalComponents[key])
}

let socket
if (import.meta.env.DEV) {
  frappeRequest({
    url: '/api/method/orbit.www.orbit.get_context_for_dev',
  }).then((values) => {
    for (const key in values) {
      window[key] = values[key]
    }
    socket = initSocket()
    app.config.globalProperties.$socket = socket
    app.mount('#app')
  })
} else {
  socket = initSocket()
  app.config.globalProperties.$socket = socket
  app.mount('#app')
}
