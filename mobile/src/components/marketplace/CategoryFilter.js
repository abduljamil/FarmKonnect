import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { CATEGORIES } from '../../constants/categories';

const CategoryFilter = ({ selected, onSelect }) => {
  return (
    <View className="mb-4 pl-5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => onSelect(cat.value)}
              className={`flex-row items-center mr-3 px-4 py-2 rounded-full border ${
                isSelected
                  ? 'bg-green-600 border-green-600'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text className="mr-1">{cat.emoji}</Text>
              <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default CategoryFilter;