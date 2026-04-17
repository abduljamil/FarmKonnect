import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { getPrices } from '../../services/priceService';

const PriceTicker = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await getPrices();
        setPrices(res.data?.data || []);
      } catch {
        // fallback static data if API fails
        setPrices([
          { _id: '1', commodity: 'Wheat',  price: 4200, change: 1.2  },
          { _id: '2', commodity: 'Rice',   price: 8500, change: -0.5 },
          { _id: '3', commodity: 'Corn',   price: 3100, change: 0.8  },
          { _id: '4', commodity: 'Cotton', price: 18000,change: 2.1  },
          { _id: '5', commodity: 'Sugar',  price: 2800, change: -1.0 },
          { _id: '6', commodity: 'Flour',  price: 5500, change: 0.3  },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  if (loading) {
    return (
      <View className="mb-6 pl-5">
        <Text className="text-lg font-bold text-gray-900 mb-3">Live Market</Text>
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="mb-6 pl-5">
      <Text className="text-lg font-bold text-gray-900 mb-3">Live Market</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {prices.map((item, idx) => {
          const isUp = item.change >= 0;
          return (
            <View
              key={idx}
              className="bg-white p-4 rounded-2xl mr-4 border border-gray-100 shadow-sm w-36"
            >
              <Text className="text-gray-500 text-xs font-medium mb-1">
                {item.commodity}
              </Text>
              <Text className="text-gray-900 font-bold text-lg mb-2">
                Rs. {item.price?.toLocaleString()}
              </Text>
              <View className={`flex-row items-center self-start px-2 py-1 rounded-full ${isUp ? 'bg-green-100' : 'bg-red-100'}`}>
                {isUp
                  ? <TrendingUp color="#15803d" size={10} />
                  : <TrendingDown color="#dc2626" size={10} />
                }
                <Text className={`text-[10px] font-bold ml-1 ${isUp ? 'text-green-700' : 'text-red-700'}`}>
                  {isUp ? '+' : ''}{item.change}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default PriceTicker;