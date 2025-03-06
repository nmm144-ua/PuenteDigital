import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView } from 'react-native';

const InicioScreen = ({ navigation }) => {
    return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Bienvenido a PuenteDigital</Text>
                <Text style={styles.subtitle}>Conectando a las personas mayores con el mundo digital</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>¿Qué es PuenteDigital?</Text>
                    <Text style={styles.cardText}>
                        PuenteDigital es una aplicación diseñada para ayudar a las personas mayores a superar la brecha digital. {'\n'}{'\n'}
                        Todo esto se consigue gracias a :{'\n'} 
                    </Text>
                    <Text style={styles.cardText}>
                        - Teleasistencia en tiempo real.{'\n'}
                        - Tutoriales interactivos para aprender a usar dispositivos.{'\n'}
                        - Soporte técnico personalizado.
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