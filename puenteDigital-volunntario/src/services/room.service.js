// src/services/room.service.js
import axios from 'axios';

// Usa la misma dirección IP que en socket.service.js
const API_URL = `http://${window.location.hostname}:3001`;

class RoomService {
  async createRoom(hostName) {
    try {
      const response = await axios.post(`${API_URL}/create-room`, { hostName });
      return response.data.room;
    } catch (error) {
      console.error('Error al crear sala:', error);
      throw error;
    }
  }

  async getRoomInfo(roomId) {
    try {
      const response = await axios.get(`${API_URL}/room/${roomId}`);
      return response.data.room;
    } catch (error) {
      console.error('Error al obtener información de sala:', error);
      throw error;
    }
  }
}

export default new RoomService();