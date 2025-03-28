// ChatScreen.jsx - Con prevención reforzada de duplicados
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  BackHandler
} from 'react-native';
import ChatService from '../../services/ChatService';
import AsistenciaService from '../../services/AsistenciaService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MensajesService from '../../services/MensajesService';

const ChatScreen = ({ route, navigation }) => {
  const { solicitudId, roomId } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteUserIsTyping, setRemoteUserIsTyping] = useState(false);
  const [solicitud, setSolicitud] = useState(null);
  
  // Agregar un set para rastrear mensajes procesados
  const processedMessagesRef = useRef(new Set());
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Cargar datos de la solicitud
  const loadSolicitud = async () => {
    try {
      const data = await AsistenciaService.obtenerSolicitud(solicitudId);
      setSolicitud(data);
      return data;
    } catch (error) {
      console.error('Error al cargar datos de la solicitud:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la solicitud');
      return null;
    }
  };
  
  const handleNewMessage = useCallback((message) => {
    console.log('Nuevo mensaje recibido en handleNewMessage:', message);
    
    // Generar una clave única para este mensaje sin el timestamp
    // Esto ayuda a identificar mensajes duplicados incluso si tienen timestamps ligeramente diferentes
    const messageContentKey = `${message.sender}_${message.message}`;
    
    // Verificar si ya hemos procesado un mensaje con el mismo contenido recientemente
    // Esto se comprobará además de las verificaciones existentes por clave exacta
    const recentlySeen = Array.from(processedMessagesRef.current).some(key => {
      // Si la clave contiene el mismo remitente y mensaje
      if (key.includes(messageContentKey)) {
        // Extraer timestamp de la clave (formato: timestamp_sender_message)
        const keyParts = key.split('_');
        if (keyParts.length > 0) {
          const keyTimestamp = new Date(keyParts[0]).getTime();
          const messageTimestamp = new Date(message.timestamp).getTime();
          
          // Considerar como duplicado si está dentro de una ventana de 5 segundos
          const timeDifference = Math.abs(keyTimestamp - messageTimestamp);
          if (timeDifference < 5000) { // 5 segundos de tolerancia
            console.log('Mensaje similar detectado dentro de la ventana de tiempo, ignorando');
            return true;
          }
        }
      }
      return false;
    });
    
    if (recentlySeen) {
      return; // Ignorar este mensaje por ser similar a uno reciente
    }
    
    // Generar la clave única normal que incluye el timestamp
    const messageKey = message.id 
      ? `id_${message.id}` 
      : `${message.timestamp}_${message.sender}_${message.message}`;
    
    // Verificar si ya hemos procesado este mensaje exacto
    if (processedMessagesRef.current.has(messageKey)) {
      console.log('Mensaje duplicado ignorado en handleNewMessage (por clave única)');
      return;
    }
    
    // Marcar como procesado
    processedMessagesRef.current.add(messageKey);
    
    setMessages((prevMessages) => {
      // Verificar duplicados en el estado actual
      const isDuplicate = prevMessages.some(m => {
        // Coincidencia exacta por ID si existe
        if (m.id && m.id === message.id) {
          return true;
        }
        
        // Coincidencia exacta por timestamp y contenido
        if (m.timestamp === message.timestamp && 
            m.message === message.message &&
            m.sender === message.sender) {
          return true;
        }
        
        // Coincidencia aproximada (mismo contenido, timestamps cercanos)
        if (m.message === message.message && 
            m.sender === message.sender) {
          const timeDiff = Math.abs(
            new Date(m.timestamp).getTime() - 
            new Date(message.timestamp).getTime()
          );
          return timeDiff < 5000; // 5 segundos de tolerancia
        }
        
        return false;
      });
      
      if (isDuplicate) {
        console.log('Mensaje duplicado ignorado (ya existe en el estado o es muy similar)');
        return prevMessages;
      }
      
      console.log('Añadiendo nuevo mensaje a la lista:', message);
      
      // Ordenar mensajes por timestamp
      return [...prevMessages, message].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
    
    setRemoteUserIsTyping(false);
    
    // Scroll al final
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);
  
  // Manejar estado de "está escribiendo"
  const handleTypingStatus = useCallback((userId, isTyping) => {
    // Actualizar solo si el evento no es del usuario actual
    if (userId !== ChatService.userId) {
      setRemoteUserIsTyping(isTyping);
    }
  }, []);
  
  // Enviar mensaje
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      // Obtener datos de solicitud
      if (!solicitud) {
        console.error('No hay solicitud activa');
        return;
      }
      
      console.log('Enviando mensaje:', inputText);
      
      // Limpiar input antes para mejor UX
      const messageText = inputText.trim();
      setInputText('');
      
      // Enviar mensaje
      await ChatService.sendMessage(messageText, solicitudId);
      
      // Limpiar estado de escritura
      setIsTyping(false);
      clearTimeout(typingTimeoutRef.current);
      ChatService.sendTypingStatus(false);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Inténtalo de nuevo.');
    }
  };
  
  // Manejar cambios en el input (detectar escritura)
  const handleInputChange = (text) => {
    setInputText(text);
    
    // Si empezamos a escribir, enviar evento
    if (text.trim().length > 0 && !isTyping) {
      setIsTyping(true);
      ChatService.sendTypingStatus(true);
    }
    
    // Si dejamos de escribir, enviar evento después de 2 segundos
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        ChatService.sendTypingStatus(false);
      }
    }, 2000);
  };
  
  // Renderizar un mensaje
  const renderMessage = ({ item }) => {
    const isOwnMessage = item.isLocal;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };
  
  // Formatear hora del mensaje
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Filtrar mensajes duplicados
  const filterDuplicateMessages = useCallback((messages) => {
    const uniqueMap = new Map();
    
    // Usar un mapa para filtrar duplicados basados en ID o contenido+timestamp
    messages.forEach(message => {
      const key = message.id ? 
        `id_${message.id}` : 
        `${message.timestamp}_${message.sender}_${message.message}`;
      
      // Añadir a nuestro registro de mensajes procesados
      processedMessagesRef.current.add(key);
      
      // Guardar solo el primer mensaje con esta clave
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, message);
      }
    });
    
    // Convertir de vuelta a array y ordenar por timestamp
    return Array.from(uniqueMap.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, []);
  
  // Efecto para inicializar chat al montar
  useEffect(() => {
    // Limpiar conjunto de mensajes procesados al iniciar
    processedMessagesRef.current.clear();
    
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Cargar solicitud
        const solicitudData = await loadSolicitud();
        if (!solicitudData) {
          navigation.goBack();
          return;
        }
        
        // Verificar si la solicitud está finalizada y mostrar alerta
        if (solicitudData.estado === 'finalizada') {
          console.log('La solicitud está finalizada');
          
          // Mostrar alerta para informar al usuario
          Alert.alert(
            'Solicitud finalizada',
            'Esta solicitud ha sido marcada como finalizada por el asistente. No podrás enviar nuevos mensajes, pero puedes revisar el historial de la conversación.',
            [
              { 
                text: 'Entendido',
                onPress: () => console.log('Usuario informado sobre solicitud finalizada')
              }
            ]
          );
        }
        
        // Obtener datos de usuario almacenados
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        
        if (!userData) {
          Alert.alert('Error', 'No se pudo obtener información del usuario');
          navigation.goBack();
          return;
        }
        
        console.log('Inicializando chat con datos de usuario:', {
          userId: userData.id,
          isAsistente: userData.isAsistente || false,
          userRole: userData.userRole || 'usuario'
        });
        
        // Inicializar servicios necesarios
        await MensajesService.init(userData.id, userData.isAsistente || false);
        
        // Inicializar chat service
        await ChatService.init();
        
        // IMPORTANTE: Desregistrar callbacks existentes para evitar duplicación
        ChatService.registerCallbacks({
          onMessageReceived: null,
          onTypingStatus: null
        });
        
        // Registrar callbacks
        ChatService.registerCallbacks({
          onMessageReceived: handleNewMessage,
          onTypingStatus: handleTypingStatus
        });
        
        // Unirse a la sala de chat
        await ChatService.joinRoom(roomId);
        
        // Marcar mensajes como leídos
        await ChatService.markMessagesAsRead(solicitudId);
        
        // Obtener mensajes
        const historicalMessages = await ChatService.loadHistoricalMessages(roomId);
        
        // Filtrar mensajes duplicados
        const uniqueMessages = filterDuplicateMessages(historicalMessages);
        
        setMessages(uniqueMessages);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al inicializar chat:', error);
        Alert.alert(
          'Error de conexión',
          'No se pudo establecer conexión con el chat. Inténtalo de nuevo.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      }
    };
    
    initializeChat();
  
    // Manejar botón de retroceso
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveChat();
      return true;
    });
    
    return () => {
      // Limpiar al desmontar
      backHandler.remove();
      clearTimeout(typingTimeoutRef.current);
      
      // Desregistrar callbacks primero para evitar llamadas durante la limpieza
      ChatService.registerCallbacks({
        onMessageReceived: null,
        onTypingStatus: null
      });
      
      // Salir de la sala de chat
      ChatService.leaveRoom();
    };
  }, [handleNewMessage, handleTypingStatus, filterDuplicateMessages]);
  
  //Efecto para el estado de la solicitud
  useEffect(() => {
    if (!solicitudId) return;
    
    const checkSolicitudStatus = async () => {
      try {
        // Obtener el estado actualizado de la solicitud
        const updatedSolicitud = await AsistenciaService.obtenerSolicitud(solicitudId);
        
        if (updatedSolicitud && updatedSolicitud.estado !== solicitud?.estado) {
          console.log('Estado de solicitud actualizado:', updatedSolicitud.estado);
          setSolicitud(updatedSolicitud);
          
          // Si la solicitud se marca como finalizada, mostrar un mensaje
          if (updatedSolicitud.estado === 'finalizada' && solicitud?.estado !== 'finalizada') {
            Alert.alert(
              'Solicitud finalizada',
              'Esta solicitud de asistencia ha sido finalizada por el asistente.',
              [{ text: 'Entendido' }]
            );
          }
        }
      } catch (error) {
        console.error('Error al verificar estado de solicitud:', error);
      }
    };
    
    // Verificar inmediatamente al cargar
    checkSolicitudStatus();
    
    // Configurar verificación periódica cada 10 segundos
    const intervalId = setInterval(checkSolicitudStatus, 10000);
    
    return () => clearInterval(intervalId);
  }, [solicitudId, solicitud?.estado]);


  // Salir del chat
  const leaveChat = () => {
    // Desregistrar callbacks primero
    ChatService.registerCallbacks({
      onMessageReceived: null,
      onTypingStatus: null
    });
    
    ChatService.leaveRoom();
    navigation.goBack();
  };
  
  // Ir a videollamada
  const startVideoCall = () => {
    if (!solicitud) return;
    
    // Navegar a la pantalla de videollamada y pasar datos
    navigation.navigate('Videollamada', {
      solicitudId,
      roomId,
      asistenteId: solicitud.asistente_id,
      asistenteName: solicitud.asistente?.nombre || 'Asistente'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={leaveChat}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {solicitud?.asistente?.nombre || 'Asistente'}
          </Text>

          {solicitud && (
            <View style={[
              styles.statusIndicator, 
              solicitud.estado === 'finalizada' ? styles.finishedStatus : 
              solicitud.estado === 'en_proceso' ? styles.activeStatus : 
              styles.pendingStatus
            ]}>
              <Text style={styles.statusText}>
                {solicitud.estado === 'finalizada' ? 'Finalizada' : 
                solicitud.estado === 'en_proceso' ? 'En proceso' : 
                'Pendiente'}
              </Text>
            </View>
          )}
          
          {remoteUserIsTyping && (
            <Text style={styles.typingText}>Escribiendo...</Text>
          )}
        </View>
        
        <TouchableOpacity style={styles.videoCallButton} onPress={startVideoCall}>
          <MaterialIcons name="videocam" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>
      
      {/* Chat messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.id?.toString() || `${item.timestamp}_${index}`}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat" size={60} color="#e0e0e0" />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>
                Escribe para comenzar la conversación
              </Text>
            </View>
          }
        />
      )}
      
      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {solicitud && solicitud.estado === 'finalizada' ? (
          <View style={styles.finishedContainer}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.finishedText}>
              Esta solicitud ha sido finalizada
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <MaterialIcons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  activeStatus: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    borderWidth: 1,
  },
  pendingStatus: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  finishedStatus: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  finishedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
  },
  finishedText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '500',
  },
  typingText: {
    fontSize: 12,
    color: '#007BFF',
    fontStyle: 'italic',
  },
  videoCallButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    minWidth: 60,
  },
  ownMessageBubble: {
    backgroundColor: '#E3F2FD',
  },
  otherMessageBubble: {
    backgroundColor: 'white',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#F8F9FA',
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#BBDEFB',
  },
});

export default ChatScreen;