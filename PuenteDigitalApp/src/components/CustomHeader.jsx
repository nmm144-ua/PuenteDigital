import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const CustomHeader = ({ navigation }) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity 
                style={styles.homeButton}
                onPress={() => navigation.navigate('Welcome')}
            >
                <Icon name="home" size={24} color="#007BFF" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    homeButton: {
        padding: 8,
    },
});