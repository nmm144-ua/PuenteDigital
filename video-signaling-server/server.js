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
  socket.on('join-room', ({ roomId, userId, userName }) => {
    console.log(`${userName} (${userId}) se une a sala ${roomId}`);
    
    // Guardar referencia de socketId a userId
    userSocketMap.set(userId, socket.id);
    
    // Unirse a la sala de Socket.io
    socket.join(roomId);
    
    // Añadir a la sala en nuestro mapeo
    const room = rooms.get(roomId) || { id: roomId, participants: [] };
    const participant = { userId, userName, socketId: socket.id };
    
    room.participants = room.participants
      .filter(p => p.userId !== userId) // Remover si ya existe
      .concat(participant);
    
    rooms.set(roomId, room);
    
    // Notificar a otros en la sala
    socket.to(roomId).emit('user-joined', participant);
    
    // Enviar lista actual de participantes al nuevo usuario
    socket.emit('room-users', room.participants.filter(p => p.userId !== userId));
    
    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`${userName} (${userId}) dejó la sala ${roomId}`);
      
      // Remover de mapeo
      userSocketMap.delete(userId);
      
      // Actualizar sala
      const currentRoom = rooms.get(roomId);
      if (currentRoom) {
        currentRoom.participants = currentRoom.participants
          .filter(p => p.userId !== userId);
        
        rooms.set(roomId, currentRoom);
      }
      
      // Notificar a otros
      socket.to(roomId).emit('user-left', { userId });
    });
  });
  
  // WebRTC señalización
  
  // 1. Oferta de conexión
  socket.on('offer', ({ offer, to, from }) => {
    console.log(`Oferta SDP recibida de ${from} para ${to}`);
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Reenviando oferta a ${to} (socket: ${toSocketId})`);
      io.to(toSocketId).emit('offer', { offer, from });
    }
  });
  
  // 2. Respuesta a la oferta
  socket.on('answer', ({ answer, to, from }) => {
    console.log(`Respuesta SDP recibida de ${from} para ${to}`);
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Reenviando respuesta a ${to} (socket: ${toSocketId})`);
      io.to(toSocketId).emit('answer', { answer, from });
    }
  });
  
  // 3. Candidatos ICE
  socket.on('ice-candidate', ({ candidate, to, from }) => {
    console.log(`Candidato ICE recibido de ${from} para ${to}`);
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Reenviando candidato a ${to} (socket: ${toSocketId})`);
      io.to(toSocketId).emit('ice-candidate', { candidate, from });
    }
  });
  
  // 4. Solicitud para iniciar llamada
  socket.on('call-user', ({ roomId, to, from, fromName }) => {
    console.log(`Solicitud de llamada recibida de ${from} para ${to}`);
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Reenviando solicitud a ${to} (socket: ${toSocketId})`);
      io.to(toSocketId).emit('call-requested', { 
        from, 
        fromName, 
        roomId 
      });
    }
  });
  
  // 5. Aceptar/rechazar llamada
  socket.on('call-response', ({ to, accepted, from }) => {
    console.log(`Respuesta aceptacion ${accepted} recibida de ${from} para ${to}`);
    const toSocketId = userSocketMap.get(to);
    if (toSocketId) {
      console.log(`Reenviando aceptacion ${accepted} a ${to} (socket: ${toSocketId})`);
      io.to(toSocketId).emit('call-response', { 
        from, 
        accepted 
      });
    }
  });
  
  // 6. Finalizar llamada
  socket.on('end-call', ({ roomId, to, from }) => {
    if (to) {
      console.log(`Finalizar llamada recibida de ${from} para ${to}`);
      // Finalizar llamada con un usuario específico
      const toSocketId = userSocketMap.get(to);
      if (toSocketId) {
        console.log(`Reenviando inalizar llamada recibida a ${to} (socket: ${toSocketId})`);
        io.to(toSocketId).emit('call-ended', { from });
      }
    } else {
      // Finalizar llamada con todos en la sala
      socket.to(roomId).emit('call-ended', { from });
    }
  });
  
  // Mensajes de chat
  socket.on('send-message', ({ roomId, message, sender }) => {
    socket.to(roomId).emit('new-message', { 
      message, 
      sender, 
      timestamp: new Date().toISOString() 
    });
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