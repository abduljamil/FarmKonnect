import React from 'react';
import { View, Text } from 'react-native';

const STYLES = {
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  danger:  { bg: 'bg-red-100',   text: 'text-red-700'   },
  warning: { bg: 'bg-yellow-100',text: 'text-yellow-700' },
  info:    { bg: 'bg-blue-100',  text: 'text-blue-700'  },
  gray:    { bg: 'bg-gray-100',  text: 'text-gray-600'  },
};

const Badge = ({ label, type = 'success' }) => {
  const style = STYLES[type] || STYLES.gray;
  return (
    <View className={`${style.bg} px-3 py-1 rounded-full self-start`}>
      <Text className={`${style.text} text-xs font-semibold capitalize`}>
        {label}
      </Text>
    </View>
  );
};

export default Badge;