import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

const InicioScreen = ({ navigation }) => {
    return (
            <View style={styles.container}>
                <Text style={styles.title}>PuenteDigital</Text>
                <Text style={styles.subtitle}>Bienvenid@ a la pagina principal</Text>
                <Text style={styles.text}>Pulse una opción de aquí</Text>

            </View>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        resizeMode: 'cover',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    title: {
        fontSize: 32,
        color: '#007BFF',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 24,
        color: '#0056b3',
        marginTop: 10,
    },
    text: {
        fontSize: 16,
        color: '#007BFF',
        marginTop: 20,
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
});

export default InicioScreen;