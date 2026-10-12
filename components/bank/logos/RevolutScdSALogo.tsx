import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
export default function RevolutScdSALogo(props: SvgProps) {
  return <Svg fill="none" viewBox="0 0 512 512" {...props}><Path fill="#fff" d="M0 0h512v512H0z" /><Path fill="#000" d="M185.855 171.936H124V422h61.855z" /><Path fill="#000" d="M288.37 282.371c50.677-2.544 91.462-45.115 91.462-96.136 0-53.063-43.22-96.235-96.347-96.235H124v53.404h151.902c24.042 0 43.958 18.885 44.398 42.096.22 11.621-4.143 22.59-12.284 30.883-8.144 8.296-19.026 12.868-30.64 12.868h-59.173a3.813 3.813 0 0 0-3.812 3.807v47.464c0 .807.25 1.579.719 2.229L315.507 422H389z" /></Svg>;
}