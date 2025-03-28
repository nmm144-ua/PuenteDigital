import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView ,Alert } from 'react-native';
import { useAuth } from '../context/AuthContext'; 

const InicioScreen = ({ navigation }) => {

    const {logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
          "Cerrar sesión",
          "¿Estás seguro de que quieres cerrar sesión?",
          [
            {
              text: "Cancelar",
              style: "cancel"
            },
            { 
              text: "Sí, cerrar sesión", 
              onPress: async () => {
                try {
                  await logout();
                  // No es necesario navegar, el AuthContext manejará esto
                } catch (error) {
                  Alert.alert("Error", "No se pudo cerrar sesión. Inténtalo de nuevo.");
                }
              }
            }
          ]
        );
      };

    return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Bienvenido a PuenteDigital</Text>
                <Text style={styles.subtitle}>Conectando a las personas mayores con el mundo digital</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>¿Qué es PuenteDigital?</Text>
                    <Text style={styles.cardText}>
                        PuenteDigital es una aplicación diseñada para ayudar a las personas mayores a superar la brecha digital. {'\n'}{'\n'}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>¿Cómo empezar?</Text>
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => navigation.navigate('OpcionesInicio')}
                    >
                        <Text style={styles.buttonText}>PULSA AQUÍ</Text>
                    </TouchableOpacity>

                </View>


                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Opciones de cuenta</Text>
                    <TouchableOpacity
                    style={[styles.button, styles.logoutButton]}
                    onPress={handleLogout}
                    >
                    <Text style={styles.buttonText}>CERRAR SESIÓN</Text>
                    </TouchableOpacity>
                </View>                

            </ScrollView>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        resizeMode: 'cover',
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        color: '#007BFF',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#0056b3',
        textAlign: 'center',
        marginBottom: 30,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 22,
        color: '#007BFF',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
        width: '80%',
        alignItems: 'center',
    },
    logoutButton: {
        backgroundColor: '#dc3545', 
      },
    buttonText: {
        color: '#fff',
        fontSize: 18,
    },
    linkButton: {
        marginTop: 20,
        padding: 10,
    },
    linkText: {
        color: '#007BFF',
        fontSize: 16,
    },
});

export default InicioScreen;