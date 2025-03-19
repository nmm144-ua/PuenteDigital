require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Función para obtener la IP de la red local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar direcciones de interfaz que no sean IPv4 o sean internas
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0'; // Fallback a todas las interfaces
}

// Obtén la IP local
const LOCAL_IP = getLocalIP();

const app = express();
const server = http.createServer(app);

// Configurar CORS para permitir conexiones desde cualquier origen en desarrollo
const allowedOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',') : 
  ['http://localhost:8080', 'capacitor://localhost', 'http://localhost'];

const corsOptions = {
  origin: true, 
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Configurar Socket.io con las mismas opciones de CORS
const io = socketIO(server, {
  cors: corsOptions
});

// Almacenamiento en memoria para las salas y usuarios
const rooms = new Map();
const userSocketMap = new Map(); // mapeo de userId -> socketId

// Rutas API
app.get('/', (req, res) => {
  res.send('Servidor de señalización WebRTC funcionando');
});

// Crear una nueva sala
app.post('/create-room', (req, res) => {
  const { hostName } = req.body;
  
  if (!hostName) {
    return res.status(400).json({ error: 'El nombre del anfitrión es requerido' });
  }
  
  const roomId = uuidv4();
  const room = {
    id: roomId,
    hostName,
    participants: [],
    createdAt: new Date().toISOString()
  };
  
  rooms.set(roomId, room);
  
  return res.json({ room });
});

// Obtener información de sala
app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  
  return res.json({ room });
});

// Gestión de conexiones Socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  
  // Unirse a una sala
  socket.on('join-room', ({ roomId, userId, userName, userRole = 'usuario' }) => {
    console.log(`${userName} (${userId}, rol: ${userRole}) se une a sala ${roomId}`);
    
    // Guardar referencia de socketId a userId
    userSocketMap.set(userId, socket.id);
    
    // Guardar datos de usuario en el objeto socket para acceder fácilmente
    socket.userId = userId;
    socket.userName = userName;
    socket.roomId = roomId;
    socket.userRole = userRole;
    
    // Unirse a la sala de Socket.io
    socket.join(roomId);
    
    // Añadir a la sala en nuestro mapeo
    const room = rooms.get(roomId) || { id: roomId, participants: [] };
    const participant = { 
      userId, 
      userName, 
      socketId: socket.id,
      userRole
    };
    
    room.participants = room.participants
      .filter(p => p.userId !== userId) // Remover si ya existe
      .concat(participant);
    
    rooms.set(roomId, room);
    
    // Notificar a otros en la sala
    socket.to(roomId).emit('user-joined', participant);
    
    // Enviar lista actual de participantes al nuevo usuario
    io.to(socket.id).emit('room-users', room.participants);
  });
  
  // Dejar una sala explícitamente
  socket.on('leave-room', ({ roomId }) => {
    const userId = socket.userId;
    const userName = socket.userName;
    
    console.log(`${userName} (${userId}) dejó la sala ${roomId}`);
    
    // Remover de mapeo
    userSocketMap.delete(userId);
    
    // Actualizar sala
    const currentRoom = rooms.get(roomId);
    if (currentRoom) {
      currentRoom.participants = currentRoom.participants
        .filter(p => p.userId !== userId);
      
      // Si la sala queda vacía, eliminarla
      if (currentRoom.participants.length === 0) {
        rooms.delete(roomId);
      } else {
        rooms.set(roomId, currentRoom);
        
        // Notificar a otros
        socket.to(roomId).emit('user-left', { userId });
        
        // Enviar lista actualizada de usuarios
        io.to(roomId).emit('room-users', currentRoom.participants);
      }
    }
    
    // Abandonar la sala de Socket.io
    socket.leave(roomId);
  });
  
  // WebRTC señalización
  
  // 1. Oferta de conexión
  socket.on('offer', ({ offer, to, from }) => {
    // Verificar que quien envía la oferta sea un asistente
    const fromSocketId = userSocketMap.get(from);
    if (!fromSocketId) return;
    
    const senderSocket = io.sockets.sockets.get(fromSocketId);
    
    // Solo permitir que asistentes envíen ofertas (inicien la conexión)
    if (senderSocket && senderSocket.userRole === 'asistente') {
      const toSocketId = userSocketMap.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit('offer', { offer, from });
      }
    } else {
      // Opcional: Informar al usuario que no tiene permisos
      if (fromSocketId) {
        io.to(fromSocketId).emit('error', {
          message: 'Solo los asistentes pueden iniciar conexiones WebRTC'
        });
      }
    }
  });
  
  // 2. Respuesta a la oferta
  socket.on('answer', ({ answer, to, from }) => {
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('answer', { answer, from });
    }
  });
  
  // 3. Candidatos ICE
  socket.on('ice-candidate', ({ candidate, to, from }) => {
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('ice-candidate', { candidate, from });
    }
  });
  
  // 4. Solicitud para iniciar llamada
  socket.on('call-user', (data) => {
    console.log(`*** EVENTO CALL-USER RECIBIDO: ${JSON.stringify(data)} ***`);
    
    const { roomId, to, from, fromName } = data;
    
    console.log(`Solicitud de llamada de ${fromName || 'Asistente'} (${from}) a ${to}`);
    
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Enviando evento call-requested a ${to}`);
      io.to(toSocketId).emit('call-requested', { 
        from, 
        fromName: fromName || 'Asistente', 
        roomId 
      });
    } else {
      console.error(`No se encontró socket para el usuario ${to}`);
    }
  });
  
  // 5. Aceptar/rechazar llamada
  socket.on('call-response', ({ to, accepted, from }) => {
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-response', { 
        from, 
        accepted 
      });
    }
  });
  
  // 6. Finalizar llamada
  socket.on('end-call', ({ roomId, to, from }) => {
    if (to) {
      // Finalizar llamada con un usuario específico
      const toSocketId = userSocketMap.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit('call-ended', { from });
      }
    } else {
      // Finalizar llamada con todos en la sala
      socket.to(roomId).emit('call-ended', { from });
    }
  });
  
  // Mensajes de chat antiguos (mantener para compatibilidad)
  socket.on('send-message', ({ roomId, message, sender }) => {
    socket.to(roomId).emit('new-message', { 
      message, 
      sender, 
      timestamp: new Date().toISOString() 
    });
  });
  
  // ===== NUEVOS EVENTOS PARA CHAT DE TEXTO =====
  
  // Evento para recibir y reenviar mensajes de chat
  socket.on('chat-message', (data) => {
    try {
      const { roomId, message, senderId, senderName, receiverId, timestamp } = data;
      
      // Validar que el mensaje tenga los campos necesarios
      if (!roomId || !message || !senderId || !senderName) {
        console.error('Mensaje de chat inválido:', data);
        return;
      }
      
      console.log(`Mensaje de chat en sala ${roomId}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
      
      // Generar un ID único para el mensaje
      const messageId = Date.now().toString();
      
      // Crear objeto de mensaje
      const messageData = {
        id: messageId,
        roomId,
        message,
        senderId,
        senderName,
        receiverId,
        timestamp: timestamp || new Date().toISOString()
      };
      
      // Si el mensaje es para un usuario específico (chat privado)
      if (receiverId) {
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          // Enviar al receptor específico
          io.to(receiverSocketId).emit('chat-message', messageData);
          // También enviar de vuelta al emisor como confirmación
          socket.emit('chat-message', {
            ...messageData,
            delivered: true
          });
        }
      } else {
        // Mensaje para toda la sala
        io.to(roomId).emit('chat-message', messageData);
      }
    } catch (error) {
      console.error('Error al procesar mensaje de chat:', error);
    }
  });
  
  // Evento para notificar que un usuario está escribiendo
  socket.on('user-typing', (data) => {
    try {
      const { roomId, userId, userName, receiverId, isTyping } = data;
      
      // Validar datos
      if (!roomId || !userId) return;
      
      const typingData = {
        roomId,
        userId,
        userName,
        isTyping: Boolean(isTyping)
      };
      
      // Si la notificación es para un usuario específico
      if (receiverId) {
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('user-typing', typingData);
        }
      } else {
        // Notificación para toda la sala
        socket.to(roomId).emit('user-typing', typingData);
      }
    } catch (error) {
      console.error('Error al procesar notificación de escritura:', error);
    }
  });
  
  // Evento para aceptar una sala de chat
  socket.on('accept-room', (data) => {
    console.log(`*** EVENTO ACCEPT-ROOM RECIBIDO: ${JSON.stringify(data)} ***`);
    
    const { roomId, asistenteId, asistenteName } = data;
    
    // Validar datos
    if (!roomId || !asistenteId || !asistenteName) {
      console.error('Datos incompletos para aceptar sala:', data);
      return;
    }
    
    
    console.log(`Sala ${roomId} aceptada por asistente ${asistenteName} (${asistenteId})`);
    
    // Notificar a todos los usuarios en la sala que ha sido aceptada
    io.to(roomId).emit('room-accepted', {
      roomId,
      asistenteId,
      asistenteName
    });
  });
  
  // Evento para finalizar el chat
  socket.on('end-chat', (data) => {
    try {
      const { roomId, userId, motivo } = data;
      
      // Notificar a todos los usuarios en la sala
      io.to(roomId).emit('chat-ended', {
        roomId,
        userId: userId || socket.userId,
        userName: socket.userName,
        motivo: motivo || 'Asistencia finalizada'
      });
      
      console.log(`Chat finalizado en sala ${roomId} por ${socket.userName || 'usuario desconocido'}`);
    } catch (error) {
      console.error('Error al finalizar chat:', error);
    }
  });

  socket.on('call-requested', ({ roomId, to, from, fromName }) => {
    console.log(`Solicitud de llamada de ${fromName} (${from}) a ${to} en sala ${roomId}`);
    
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-requested', { 
        from, 
        fromName, 
        roomId 
      });
    }
  });
  
  // Evento de desconexión
  socket.on('disconnect', () => {
    const userId = socket.userId;
    const userName = socket.userName;
    const roomId = socket.roomId;
    
    console.log(`Usuario desconectado: ${socket.id} (${userId || 'desconocido'})`);
    
    // Si el usuario estaba en una sala, notificar a los demás y limpiar
    if (roomId && userId) {
      // Remover de mapeo
      userSocketMap.delete(userId);
      
      // Actualizar sala
      const currentRoom = rooms.get(roomId);
      if (currentRoom) {
        currentRoom.participants = currentRoom.participants
          .filter(p => p.userId !== userId);
        
        // Si la sala queda vacía, eliminarla
        if (currentRoom.participants.length === 0) {
          rooms.delete(roomId);
        } else {
          rooms.set(roomId, currentRoom);
          
          // Notificar a otros
          socket.to(roomId).emit('user-left', { userId });
          
          // Enviar lista actualizada de usuarios
          io.to(roomId).emit('room-users', currentRoom.participants);
        }
      }
    }
  });
});

// Iniciar servidor en todas las interfaces de red
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de señalización WebRTC funcionando`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Red: http://${LOCAL_IP}:${PORT}`);
  console.log('Para acceder desde cualquier dispositivo en la red, usa la URL de Red');
});
