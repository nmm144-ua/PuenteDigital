import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Toaster } from 'vue-sonner'

import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'; 
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './assets/main.css'; 
import '@fortawesome/fontawesome-free/css/all.min.css';

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('Toaster', Toaster)

app.use(Toaster, {
    position: 'top-right',
    duration: 4000,
    richColors: true,
    closeButton: true,
    pauseWhenHover: true,
    visibleToasts: 3
  })


app.mount('#app')
