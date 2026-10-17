import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
/* SVGR has dropped some elements not supported by react-native-svg: title */
import type { SvgProps } from "react-native-svg";
export default function BcoSantanderBrasilSALogo(props: SvgProps) {
  return <Svg viewBox="0 0 512 512" {...props}><G fill="none" fillRule="evenodd"><Path fill="#fff" d="M0 0h512v512H0z" /><Path fill="#ec0000" fillRule="nonzero" d="M327.948 242.708c-.512-11.424-3.66-22.702-9.588-32.881l-51.967-90.077c-3.952-6.884-6.733-14.207-8.197-21.75L256 101.735c-12.882 22.263-12.882 49.725 0 72.061l41.573 72.061c12.882 22.263 12.882 49.799 0 72.061l-2.196 3.735c-1.537-7.543-4.245-14.94-8.197-21.75l-38.06-65.983-24.3-42.109c-3.952-6.884-6.734-14.207-8.197-21.75l-2.196 3.735c-12.809 22.19-12.882 49.579-.147 71.842l41.72 72.28c12.882 22.263 12.882 49.726 0 72.062l-2.196 3.734c-1.537-7.543-4.245-14.939-8.197-21.75l-51.967-90.076a72.3 72.3 0 0 1-9.588-39.18C128.426 257.282 90 288.113 90 323.924 90 373.649 164.29 414 256 414c91.637 0 166-40.351 166-90.076 0-35.811-38.426-66.642-94.052-81.216" /></G></Svg>;
}