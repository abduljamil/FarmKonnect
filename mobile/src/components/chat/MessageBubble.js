import React from 'react';
import { View, Text } from 'react-native';

const MessageBubble = ({ message, isOwn }) => {
  return (
    <View className={`flex-row mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[75%] px-4 py-3 rounded-2xl ${isOwn ? 'bg-green-600 rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm'}`}>
        <Text className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
          {message.content}
        </Text>
        <Text className={`text-[10px] mt-1 ${isOwn ? 'text-green-200' : 'text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

export default MessageBubble;