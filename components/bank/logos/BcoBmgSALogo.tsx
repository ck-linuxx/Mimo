import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
export default function BcoBmgSALogo(props: SvgProps) {
  return <Svg fill="none" viewBox="0 0 512 512" {...props}><Path fill="#fa6300" d="M0 0h512v512H0z" /><Path fill="#462a71" d="M254.401 220.773c0-9.624 8.707-16.956 17.872-15.581 49.95 7.332 88.902 50.867 88.902 103.108-.458 82.028-65.989 99.442-93.943 103.566-6.874.917-12.831-4.582-12.831-11.456z" /><Path fill="#fff" d="M171.915 314.716h46.742c19.705 0 35.744-16.039 35.744-35.744V118.123c0-6.415-5.041-11.456-11.456-11.456h-21.997c-33.453 0-60.948 27.495-60.948 60.948v135.644c0 6.416 5.499 11.457 11.915 11.457" /></Svg>;
}