
<!-- VideoWidget.vue -->
<template>
    <div class="widget">
      <div class="widget-header">
        <div class="icon-container">
          <i class="fas fa-video"></i>
        </div>
        <h2>Videollamadas</h2>
      </div>
      <div class="widget-content">
        <div class="stats">
          <div class="stat">
            <span class="stat-number">{{ pendientes }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ atendidas }}</span>
            <span class="stat-label">Atendidas</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ enProcesoAhora }}</span>
            <span class="stat-label">En curso</span>
          </div>
        </div>
        <p class="widget-description">
          Proporciona asistencia en tiempo real mediante videollamadas para resolver problemas de manera más efectiva.
        </p>
        <router-link to="asistente/gestion-llamadas" class="action-button">
          <span>Ver videollamadas</span>
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
  const atendidas = ref(0);
  const enProcesoAhora = ref(0);
  const asistenteId = ref(null);
  let unsubscribe = null;
  
  // Cargar datos iniciales
  const loadData = async () => {
    try {
      // Obtener ID del asistente
      const asistente = await asistenteService.getAsistenteByUserId(authStore.user.id);
      if (asistente) {
        asistenteId.value = asistente.id;
        
        // Cargar solicitudes de videollamada
        const videoLlamadas = await solicitudesAsistenciaService.getVideoSolicitudes();
        
        // Contar pendientes (sin asignar)
        pendientes.value = videoLlamadas.filter(v => v.estado === 'pendiente' && !v.asistente_id).length;
        
        // Contar en proceso ahora (asignadas a este asistente y en estado en_proceso)
        enProcesoAhora.value = videoLlamadas.filter(v => 
          v.asistente_id === asistenteId.value && 
          v.estado === 'en_proceso'
        ).length;
        
        // Contar atendidas (finalizadas por este asistente)
        atendidas.value = videoLlamadas.filter(v => 
          v.asistente_id === asistenteId.value && 
          v.estado === 'finalizada'
        ).length;
      }
    } catch (error) {
      console.error('Error al cargar datos de videollamadas:', error);
    }
  };
  
  // Suscribirse a cambios en tiempo real
  const setupSubscription = () => {
    const channel = supabase
      .channel('video_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_asistencia'
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
    background-color: #4caf50; /* Color verde para videollamadas */
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
    color: #4caf50; /* Color verde para videollamadas */
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
    background-color: #4caf50; /* Color verde para videollamadas */
    color: white;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    background-color: #388e3c;
  }
  </style>