import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const NoDisponibleScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            
            <Text style={styles.title}>¡Ups! Esta página no está disponible</Text>
            <Text style={styles.text}>
                Estamos trabajando duro para traerte esta funcionalidad muy pronto. ¡Gracias por tu paciencia!
            </Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.goBack()} // Regresa a la pantalla anterior
            >
                <Text style={styles.buttonText}>Volver atrás</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Inicio')} // Navega a la pantalla de inicio
            >
                <Text style={styles.linkText}>Ir a la página principal</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    image: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        color: '#007BFF',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    text: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
        width: '80%',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
    },
    linkButton: {
        padding: 10,
    },
    linkText: {
        color: '#007BFF',
        fontSize: 16,
    },
});

export default NoDisponibleScreen;