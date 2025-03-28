<!-- src/views/VideollamadaView.vue -->
<template>
  <div class="videollamada-view">
    <videollamada-controls
      :room-id="roomId"
      :role="userRole"
      :user-name="userName"
    />
  </div>
</template>

<script>
import VideollamadaControls from '../../components/VideoCall/VideoLlamadaControls.vue';
import { useCallStore } from '../../stores/call.store';

export default {
  name: 'VideollamadaView',
  components: {
    VideollamadaControls
  },
  computed: {
    roomId() {
      return this.$route.params.id;
    },
    callStore() {
      return useCallStore();
    },
    userRole() {
      return this.callStore.userRole;
    },
    userName() {
      return this.callStore.userName;
    }
  }
}
</script>

<style scoped>
.videollamada-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Esta vista no tiene estilos propios, delega en el componente VideollamadaControls */
</style>