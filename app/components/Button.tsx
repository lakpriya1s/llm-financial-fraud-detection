import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    buttonStyle?: StyleProp<ViewStyle>;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, disabled, buttonStyle }) => {
    return (
        <TouchableOpacity style={disabled ? [styles.buttonDisabled, buttonStyle] : [styles.button, buttonStyle]} onPress={onPress} disabled={disabled}>
            <Text style={styles.buttonText}>{title}</Text>
        </TouchableOpacity>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#004AAD',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
});
