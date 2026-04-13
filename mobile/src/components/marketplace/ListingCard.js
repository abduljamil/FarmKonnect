import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MapPin, Package } from 'lucide-react-native';
import Badge from '../ui/Badge';

const ListingCard = ({ item, onPress }) => {
  const statusColors = {
    active:   'success',
    sold:     'danger',
    inactive: 'gray',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-4 overflow-hidden"
    >
      {/* Image */}
      {item.images?.[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          className="w-full h-44"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-44 bg-green-50 items-center justify-center">
          <Package color="#16a34a" size={40} />
          <Text className="text-green-400 text-xs mt-2">No Image</Text>
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-gray-900 font-bold text-base flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <Badge label={item.status} type={statusColors[item.status] || 'gray'} />
        </View>

        <Text className="text-green-600 font-bold text-lg mb-2">
          Rs. {item.price?.toLocaleString()}
          <Text className="text-gray-400 text-sm font-normal">
            {item.unit ? ` / ${item.unit}` : ''}
          </Text>
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MapPin color="#9ca3af" size={13} />
            <Text className="text-gray-400 text-xs ml-1" numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <Text className="text-gray-400 text-xs">
            Qty: {item.quantity} {item.unit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ListingCard;