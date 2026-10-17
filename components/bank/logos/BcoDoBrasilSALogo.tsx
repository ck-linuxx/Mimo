import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
export default function BcoDoBrasilSALogo(props: SvgProps) {
  return <Svg fill="none" viewBox="0 0 512 512" {...props}><Path fill="#fcfc30" d="M0 0h512v512H0z" /><Path fill="#465eff" d="m320.844 200.667-33.719-22.479L90 311.334 256 422l166-110.666-69.167-45.823-83 56.198 36.313 23.344L256 375.313l-94.24-63.979zM159.167 376.177l-34.584-23.344L90 376.177V422z" /><Path fill="#465eff" d="M422 200.667 256 90 90 200.667l69.167 45.823 83-56.198-36.313-23.344L256 136.687l94.24 63.98-159.084 110.666 33.718 22.48zM422 135.823V90l-69.167 45.823 34.583 23.344z" /></Svg>;
}