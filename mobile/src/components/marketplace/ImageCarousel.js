import React, { useState } from 'react';
import { View, Image, ScrollView, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Package } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const ImageCarousel = ({ images = [] }) => {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return (
      <View className="w-full h-64 bg-green-50 items-center justify-center">
        <Package color="#16a34a" size={50} />
        <Text className="text-green-400 text-sm mt-2">No Images</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActive(index);
        }}
      >
        {images.map((uri, index) => (
          <Image
            key={index}
            source={{ uri }}
            style={{ width, height: 280 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Dots */}
      {images.length > 1 && (
        <View className="flex-row justify-center mt-3">
          {images.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === active ? 'bg-green-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ImageCarousel;