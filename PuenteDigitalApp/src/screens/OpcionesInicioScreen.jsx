import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView } from 'react-native';

const OpcionesInicioScreen = ({ navigation }) => {
    return (
            <ScrollView contentContainerStyle={styles.container}>
                
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>¿Cómo empezar?</Text>
                    <Text style={styles.cardText}>
                        Selecciona una de estas opciones.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => navigation.navigate('Asistencia')}
                >
                    <Text style={styles.buttonText}>Solicita asistencia</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => navigation.navigate('Tutoriales')}
                >
                    <Text style={styles.buttonText}>Ver Tutoriales</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => navigation.navigate('Mensajes')}
                >
                    <Text style={styles.buttonText}>Ver mis Mensajes</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => navigation.navigate('MisSolicitudes')}
                >
                    <Text style={styles.buttonText}>Ver Mis Solicitudes</Text>
                </TouchableOpacity>


                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.navigate('Inicio')}
                >
                    <Text style={styles.linkText}>Ir a la página principal</Text>
                </TouchableOpacity>
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

export default OpcionesInicioScreen;