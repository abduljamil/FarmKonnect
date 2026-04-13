import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

const Loader = ({ message = 'Loading...' }) => (
  <View className="flex-1 items-center justify-center bg-gray-50">
    <ActivityIndicator size="large" color="#16a34a" />
    <Text className="text-gray-500 mt-3 text-sm">{message}</Text>
  </View>
);

export default Loader;