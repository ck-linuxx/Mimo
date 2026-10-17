import React from 'react';
import { Image, type ImageProps } from 'react-native';

const source = require('../../../assets/banks/105.png');

export default function LeccaCfiSALogo({ width = 24, height = 24, style }: { width?: number; height?: number; style?: ImageProps['style'] }) {
  return <Image source={source} style={[{ width, height }, style]} resizeMode="contain" />;
}
