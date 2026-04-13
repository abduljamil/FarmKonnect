import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MapPin, Wind, Droplets } from 'lucide-react-native';
import api from '../../services/api';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await api.get('/weather');
        setWeather(res.data?.data);
      } catch {
        // fallback static data if API fails
        setWeather({
          city: 'Lahore',
          temperature: 28,
          condition: 'Sunny',
          humidity: 45,
          windSpeed: 12,
          emoji: '☀️',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <View className="px-5 mb-10">
        <Text className="text-lg font-bold text-gray-900 mb-3">Local Weather</Text>
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm items-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      </View>
    );
  }

  return (
    <View className="px-5 mb-10">
      <Text className="text-lg font-bold text-gray-900 mb-3">Local Weather</Text>
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center mb-1">
            <MapPin color="#6b7280" size={14} />
            <Text className="text-gray-500 text-xs ml-1">
              {weather?.city || 'Lahore'}, PK
            </Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            {weather?.temperature}°C
          </Text>
          <Text className="text-green-600 font-medium text-sm mb-3">
            {weather?.condition}
          </Text>
          <View className="flex-row gap-4">
            <View className="flex-row items-center">
              <Droplets color="#3b82f6" size={14} />
              <Text className="text-gray-500 text-xs ml-1">
                {weather?.humidity}%
              </Text>
            </View>
            <View className="flex-row items-center">
              <Wind color="#6b7280" size={14} />
              <Text className="text-gray-500 text-xs ml-1">
                {weather?.windSpeed} km/h
              </Text>
            </View>
          </View>
        </View>
        <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center">
          <Text className="text-3xl">{weather?.emoji || '☀️'}</Text>
        </View>
      </View>
    </View>
  );
};

export default WeatherWidget;