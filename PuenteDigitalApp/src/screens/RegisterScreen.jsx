import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { requestDeviceInfoPermissions } from '../utils/PermissionsHandlers';

const RegisterScreen = ({ navigation }) => {
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        // Full name validation
        if (!formData.fullName) {
            newErrors.fullName = 'El nombre completo es requerido';
        } else if (formData.fullName.length < 3) {
            newErrors.fullName = 'El nombre debe tener al menos 3 caracteres';
        }

        // Email validation
        if (!formData.email) {
            newErrors.email = 'El correo electrónico es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'El correo electrónico no es válido';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        } else if (!/(?=.*[A-Z])/.test(formData.password)) {
            newErrors.password = 'La contraseña debe contener al menos una mayúscula';
        } else if (!/(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'La contraseña debe contener al menos un número';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Por favor confirme la contraseña';
        } else if (formData.confirmPassword !== formData.password) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        // Solicitar permisos antes de registrar
        const permissionsGranted = await requestDeviceInfoPermissions();
        if (!permissionsGranted) {
            Alert.alert(
                'Permisos requeridos',
                'Necesitamos acceso a información básica del dispositivo para continuar.'
            );
            return;
        }

        setLoading(true);
        try {
            const { success, error } = await register(
                formData.fullName,
                formData.email,
                formData.password
            );
            
            if (success) {
                Alert.alert(
                    'Éxito',
                    'Cuenta creada exitosamente',
                    [
                        {
                            text: 'OK',
                        }
                    ]
                );
            } else {
                Alert.alert('Error', error?.message || 'No se pudo crear la cuenta');
            }
        } catch (error) {
            Alert.alert(
                'Error',
                'No se pudo crear la cuenta. Por favor, intente nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const renderInput = (field, placeholder, options = {}) => (
        <View style={styles.inputContainer}>
            <TextInput
                placeholder={placeholder}
                style={[styles.input, errors[field] && styles.inputError]}
                value={formData[field]}
                onChangeText={(value) => handleInputChange(field, value)}
                {...options}
            />
            {errors[field] && (
                <Text style={styles.errorText}>{errors[field]}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registrarse</Text>
            
            {renderInput('fullName', 'Nombre completo', {
                autoCapitalize: 'words'
            })}
            
            {renderInput('email', 'Correo electrónico', {
                keyboardType: 'email-address',
                autoCapitalize: 'none'
            })}
            
            {renderInput('password', 'Contraseña', {
                secureTextEntry: true
            })}
            
            {renderInput('confirmPassword', 'Confirmar contraseña', {
                secureTextEntry: true
            })}

            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
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

export default RegisterScreen;