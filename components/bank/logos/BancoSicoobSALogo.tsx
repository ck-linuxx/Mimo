import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
export default function BancoSicoobSALogo(props: SvgProps) {
  return <Svg fill="none" viewBox="0 0 512 512" {...props}><Path fill="#7db61c" d="M106.525 132.119c-2.543.254-5.212.953-7.627 2.352-5.72 3.304-8.96 9.342-8.897 15.633 0 2.733.572 5.402 1.843 8.072L180.5 312.163l28.725-49.698L256 181.69l-28.662-49.571z" /><Path fill="#00ae9d" d="m227.338 132.119 75.374 130.346h57.26l60.248-104.671c1.08-2.288 1.779-4.893 1.779-7.69 0-9.532-7.562-17.349-17.032-17.985z" /><Path fill="#c9d200" d="M355.714 262.463H209.226L180.5 312.161l60.629 104.48c1.462 2.161 3.368 4.067 5.783 5.466 2.797 1.652 5.911 2.415 9.025 2.415 5.847 0 11.63-2.987 15.062-8.199l88.973-153.86z" /></Svg>;
}