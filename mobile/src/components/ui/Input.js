import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error = '',
  multiline = false,
  numberOfLines = 1,
  leftIcon = null,
  editable = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-gray-700 font-semibold mb-2 text-sm">{label}</Text>
      ) : null}
      <View className={`flex-row items-center bg-white border rounded-2xl px-4 ${error ? 'border-red-400' : 'border-gray-200'} ${!editable ? 'opacity-60' : ''}`}>
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          className={`flex-1 text-gray-900 text-base ${multiline ? 'py-3 min-h-[100px]' : 'py-4'}`}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword
              ? <EyeOff color="#9ca3af" size={20} />
              : <Eye color="#9ca3af" size={20} />}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
};

export default Input;