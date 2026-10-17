import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
export default function PicpayLogo(props: SvgProps) {
  return <Svg fill="none" viewBox="0 0 512 512" {...props}><Path fill="#11c76f" d="M90 173.001C90 127.161 127.161 90 173.001 90h165.998C384.839 90 422 127.161 422 173.001v165.998c0 45.84-37.161 83.001-83.001 83.001H173.001C127.161 422 90 384.839 90 338.999z" /><Path fill="#fff" fillRule="evenodd" d="M216.452 199.601h-30.255v26.865h28.605c18.143 0 28.45 8.807 28.45 24.877 0 16.482-10.307 25.496-28.45 25.496h-28.605v-50.373h-31.928v117.538h31.928v-40.296h30.255c36.699 0 57.728-19.913 57.728-53.496 0-31.933-21.029-50.611-57.728-50.611M293.609 232.072h64.122v-64.076h-64.122zm10.699-10.676h42.751V178.68h-42.751zm32.04-10.676h-21.375v-21.36h21.375z" clipRule="evenodd" /></Svg>;
}