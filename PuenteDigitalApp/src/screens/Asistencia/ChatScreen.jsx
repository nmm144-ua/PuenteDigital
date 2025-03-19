import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  BackHandler
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SocketService from '../../services/socketService';

const ChatScreen = ({ route, navigation }) => {
  const { solicitudId, roomId, asistenteId, asistenteName } = route.params;
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typing, setTyping] = useState(false);
  
  const flatListRef = useRef();
  const typingTimeoutRef = useRef(null);
  const chatInitializedRef = useRef(false);
  
  // Inicializar chat
  const inicializarChat = async () => {
    if (chatInitializedRef.current) return;
    
    try {
      setLoading(true);
      
      // Conectar al servidor socket si no estamos conectados
      if (!SocketService.isConnected) {
        await SocketService.connect();
      }
      
      // Unirse a la sala de chat
      if (!SocketService.currentRoom || SocketService.currentRoom !== roomId) {
        await SocketService.joinRoom(roomId, user?.id, user?.nombre);
      }
      
      // Configurar listeners para mensajes y escritura
      setupChatListeners();
      
      // Cargar mensajes anteriores (simulado)
      setTimeout(() => {
        setLoading(false);
        chatInitializedRef.current = true;
      }, 1000);
    } catch (error) {
      console.error('Error al inicializar chat:', error);
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar al servicio de chat. Intenta nuevamente.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }]
      );
    }
  };
  
  // Configurar listeners para mensajes y escritura
  const setupChatListeners = () => {
    // Eliminar listeners anteriores
    SocketService.off('chat-message');
    SocketService.off('user-typing');
    
    // Registrar nuevo listener para mensajes
    SocketService.on('chat-message', handleIncomingMessage);
    
    // Registrar nuevo listener para escritura
    SocketService.on('user-typing', handleTypingNotification);
  };
  
  // Manejar mensaje recibido
  const handleIncomingMessage = (data) => {
    // No mostrar mensajes propios recibidos por socket (ya los añadimos al enviar)
    if (data.from === user?.id) return;
    
    const newMessage = {
      id: data.id || Date.now().toString(),
      text: data.message,
      senderId: data.from,
      senderName: data.fromName || asistenteName || 'Asistente',
      timestamp: new Date(data.timestamp || Date.now()),
      isOwnMessage: false
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    scrollToBottom();
  };
  
  // Manejar notificación de escritura
  const handleTypingNotification = (data) => {
    // Verificar que la notificación sea del asistente
    if (data.userId === user?.id) return;
    
    setIsTyping(data.isTyping);
    
    // Si deja de escribir, ocultar indicador después de un tiempo
    if (!data.isTyping) {
      setTimeout(() => setIsTyping(false), 1000);
    }
  };
  
  // Enviar mensaje
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      // Crear mensaje local
      const messageData = {
        id: Date.now().toString(),
        text: inputMessage.trim(),
        senderId: user?.id,
        senderName: 'Tú',
        timestamp: new Date(),
        isOwnMessage: true
      };
      
      // Añadir mensaje a la lista local
      setMessages(prevMessages => [...prevMessages, messageData]);
      
      // Limpiar input
      setInputMessage('');
      
      // Enviar notificación de que ya no estamos escribiendo
      SocketService.sendTypingNotification(false, asistenteId);
      
      // Enviar mensaje a través del socket
      SocketService.sendMessage(messageData.text, asistenteId);
      
      // Desplazar al final de la lista
      scrollToBottom();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  };
  
  // Manejar cambio en el input
  const handleInputChange = (text) => {
    setInputMessage(text);
    
    // Notificar que el usuario está escribiendo
    if (!typing && text.length > 0) {
      setTyping(true);
      SocketService.sendTypingNotification(true, asistenteId);
    }
    
    // Si el usuario deja de escribir durante un tiempo, notificar
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (typing) {
        setTyping(false);
        SocketService.sendTypingNotification(false, asistenteId);
      }
    }, 1500);
  };
  
  // Desplazar al final de la lista
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };
  
  // Formatear hora del mensaje
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Renderizar un mensaje
  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
      ]}>
        {!item.isOwnMessage && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <Text style={[
          styles.messageText,
          item.isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          item.isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatMessageTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );
  
  // Salir del chat
  const salirDelChat = () => {
    Alert.alert(
      'Salir del chat',
      '¿Estás seguro que deseas salir del chat?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive',
          onPress: () => {
            // Abandonar la sala de chat
            if (SocketService.currentRoom === roomId) {
              SocketService.leaveRoom();
            }
            
            // Remover listeners
            SocketService.off('chat-message', handleIncomingMessage);
            SocketService.off('user-typing', handleTypingNotification);
            
            navigation.goBack();
          }
        }
      ]
    );
  };
  
  useEffect(() => {
    // Inicializar chat
    inicializarChat();
    
    // Prevenir navegación hacia atrás sin confirmar
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      salirDelChat();
      return true;
    });
    
    return () => {
      // Limpiar al desmontar
      backHandler.remove();
      
      // Remover listeners
      SocketService.off('chat-message', handleIncomingMessage);
      SocketService.off('user-typing', handleTypingNotification);
      
      // Limpiar timeout de escritura
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Abandonar la sala de chat solo si estamos en ella
      if (chatInitializedRef.current && SocketService.currentRoom === roomId) {
        SocketService.leaveRoom();
      }
    };
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={salirDelChat}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{asistenteName || 'Asistente'}</Text>
          <Text style={styles.headerSubtitle}>
            {isTyping ? 'Escribiendo...' : 'En línea'}
          </Text>
        </View>
      </View>
      
      {/* Chat Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />
      )}
      
      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {asistenteName || 'Asistente'} está escribiendo...
          </Text>
        </View>
      )}
      
      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={inputMessage}
          onChangeText={handleInputChange}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!inputMessage.trim()}
        >
          <MaterialIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#007BFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  ownMessageBubble: {
    backgroundColor: '#007BFF',
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  typingContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  }
});

export default ChatScreen;