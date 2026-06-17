import React, { useState } from 'react';
import { Image } from 'react-native';

const FALLBACK = require('../../../assets/icon.png');

export default function Avatar({ uri, size = 40, style }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : FALLBACK}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      fadeDuration={0}
      onError={() => setFailed(true)}
    />
  );
}
