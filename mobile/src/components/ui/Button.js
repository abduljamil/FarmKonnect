import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

const VARIANTS = {
  primary: { btn: 'bg-green-600',   text: 'text-white'      },
  outline: { btn: 'border-2 border-green-600', text: 'text-green-600' },
  danger:  { btn: 'bg-red-500',     text: 'text-white'      },
  ghost:   { btn: 'bg-gray-100',    text: 'text-gray-700'   },
};

const SIZES = {
  sm: { btn: 'px-4 py-2',  text: 'text-sm'  },
  md: { btn: 'px-6 py-4',  text: 'text-base' },
  lg: { btn: 'px-8 py-5',  text: 'text-lg'  },
};

const Button = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  icon = null,
}) => {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-2xl ${v.btn} ${s.btn} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#16a34a'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && icon}
          <Text className={`font-bold ${v.text} ${s.text}`}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;