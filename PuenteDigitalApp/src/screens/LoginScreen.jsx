import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        // Email validation
        if (!email) {
            newErrors.email = 'El correo electrónico es requerido';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'El correo electrónico no es válido';
        }

        // Password validation
        if (!password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Here you would add your actual authentication logic
            // For example, API call to your backend
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            
            // If login successful
            navigation.navigate('Inicio');
        } catch (error) {
            Alert.alert(
                'Error',
                'No se pudo iniciar sesión. Por favor, intente nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Iniciar Sesión</Text>
            
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Correo electrónico"
                    style={[styles.input, errors.email && styles.inputError]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                )}
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Contraseña"
                    style={[styles.input, errors.password && styles.inputError]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                )}
            </View>

            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Cargando...' : 'Iniciar sesión'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => navigation.navigate('Welcome')}
            >
                <Text style={styles.linkText}>Volver a la pantalla principal</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        fontSize: 32,
        color: '#007BFF',
        fontWeight: 'bold',
        marginBottom: 30,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 15,
    },
    input: {
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: '#007BFF',
        borderRadius: 5,
        fontSize: 16,
    },
    inputError: {
        borderColor: '#ff0000',
    },
    errorText: {
        color: '#ff0000',
        fontSize: 12,
        marginTop: 5,
        marginLeft: 5,
    },
    button: {
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
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

export default LoginScreen;