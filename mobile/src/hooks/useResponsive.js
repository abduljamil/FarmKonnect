import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const scale = (size) => (width / 390) * size;
export const verticalScale = (size) => (height / 844) * size;

export const useResponsive = () => {
  return {
    s: scale,
    vs: verticalScale,
    width,
    height,
    isTablet: width >= 768,
    isSmallPhone: width < 375,
    numColumns: width >= 768 ? 3 : 2,
  };
};