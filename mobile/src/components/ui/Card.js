import React from 'react';
import { View } from 'react-native';

const Card = ({ children, className = '' }) => (
  <View className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-4 ${className}`}>
    {children}
  </View>
);

export default Card;