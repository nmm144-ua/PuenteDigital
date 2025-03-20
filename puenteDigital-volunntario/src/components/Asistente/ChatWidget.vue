<!-- ChatWidget.vue -->
<template>
    <div class="widget">
      <div class="widget-header">
        <div class="icon-container">
          <i class="fas fa-comments"></i>
        </div>
        <h2>Chat de Asistencia</h2>
      </div>
      <div class="widget-content">
        <div class="stats">
          <div class="stat">
            <span class="stat-number">{{ pendientes }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ asignados }}</span>
            <span class="stat-label">Asignados</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ noLeidos }}</span>
            <span class="stat-label">No leídos</span>
          </div>
        </div>
        <p class="widget-description">
          Gestiona las conversaciones de chat con los usuarios que necesitan tu asistencia.
        </p>
        <router-link to="/asistente/chat" class="action-button">
          <span>Ir al chat</span>
          <i class="fas fa-arrow-right"></i>
        </router-link>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { solicitudesAsistenciaService } from '@/services/solicitudAsistenciaService';
  import { asistenteService } from '@/services/asistenteService';
  import { useAuthStore } from '@/stores/authStore';
  import { supabase } from '../../../supabase';
  
  const authStore = useAuthStore();
  const pendientes = ref(0);
  const asignados = ref(0);
  const noLeidos = ref(0);
  const asistenteId = ref(null);
  let unsubscribe = null;
  
  // Cargar datos iniciales
  const loadData = async () => {
    try {
      // Obtener ID del asistente
      const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
      if (asistente) {
        asistenteId.value = asistente.id;
        
        // Cargar solicitudes de chat
        const chats = await solicitudesAsistenciaService.getChatSolicitudes();
        
        // Contar pendientes (sin asignar)
        pendientes.value = chats.filter(c => c.estado === 'pendiente' && !c.asistente_id).length;
        
        // Contar asignados a este asistente
        asignados.value = chats.filter(c => c.asistente_id === asistenteId.value).length;
        
        // Contar mensajes no leídos
        const mensajesNoLeidos = await supabase
          .from('mensajes')
          .select('id', { count: 'exact' })
          .eq('leido', false)
          .not('usuario_id', 'is', null)
          .in('solicitud_id', chats.filter(c => c.asistente_id === asistenteId.value).map(c => c.id));
        
        if (!mensajesNoLeidos.error) {
          noLeidos.value = mensajesNoLeidos.count || 0;
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del chat:', error);
    }
  };
  
  // Suscribirse a cambios en tiempo real
  const setupSubscription = () => {
    const channel = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_asistencia'
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes'
        },
        () => loadData()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };
  
  onMounted(() => {
    loadData();
    unsubscribe = setupSubscription();
  });
  
  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });
  </script>
  
  <style scoped>
  .widget {
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .widget:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
  
  .widget-header {
    background-color: #1976d2;
    color: white;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .icon-container {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .icon-container i {
    font-size: 24px;
  }
  
  .widget-header h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
  }
  
  .widget-content {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  
  .stat {
    text-align: center;
    flex: 1;
  }
  
  .stat-number {
    display: block;
    font-size: 1.8rem;
    font-weight: 700;
    color: #1976d2;
    margin-bottom: 5px;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6c757d;
  }
  
  .widget-description {
    color: #6c757d;
    margin-bottom: 1.5rem;
    flex-grow: 1;
    line-height: 1.5;
  }
  
  .action-button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background-color: #1976d2;
    color: white;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    background-color: #0d47a1;
  }
  </style>
  