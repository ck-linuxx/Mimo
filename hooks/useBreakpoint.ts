import { useWindowDimensions } from 'react-native';

export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';

export const BREAKPOINTS = {
  PHONE_MAX: 599,
  TABLET_MIN: 600,
  LARGE_TABLET_MIN: 1024,
} as const;

export interface ResponsiveSelectOptions<T> {
  phone: T;
  tablet?: T;
  tabletLandscape?: T;
  largeTablet?: T;
}

export interface BreakpointInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  isTablet: boolean;
  isPhone: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  isLargeTablet: boolean;
  /** True when the device is a tablet held in horizontal / landscape orientation (laptop/notebook mode) */
  isNotebookMode: boolean;
  columns: number;
  contentMaxWidth: number | undefined;
  formMaxWidth: number | undefined;
  select: <T>(options: ResponsiveSelectOptions<T>) => T;
  scale: (size: number, factor?: number) => number;
}

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPortrait = !isLandscape;
  // A tablet is defined either by the standard smallest-width (sw >= 600dp) or current width >= 600dp
  const smallestDimension = Math.min(width, height);
  const isTablet = smallestDimension >= BREAKPOINTS.TABLET_MIN || width >= BREAKPOINTS.TABLET_MIN;
  const isLargeTablet = smallestDimension >= 768 || width >= BREAKPOINTS.LARGE_TABLET_MIN;
  const isPhone = !isTablet;
  const isNotebookMode = isTablet && isLandscape;
  const deviceType: DeviceType = isTablet ? 'tablet' : 'phone';

  const columns = isPhone ? 1 : isNotebookMode ? 3 : 2;

  const contentMaxWidth = isPhone ? undefined : isLandscape ? 1200 : 840;
  const formMaxWidth = isPhone ? undefined : 640;

  const select = <T,>(options: ResponsiveSelectOptions<T>): T => {
    if (isLargeTablet && options.largeTablet !== undefined) {
      return options.largeTablet;
    }
    if (isTablet && isLandscape && options.tabletLandscape !== undefined) {
      return options.tabletLandscape;
    }
    if (isTablet && options.tablet !== undefined) {
      return options.tablet;
    }
    return options.phone;
  };

  const scale = (size: number, factor = 0.5): number => {
    if (isPhone) return size;
    const multiplier = 1 + 0.15 * factor;
    return Math.round(size * multiplier);
  };

  return {
    width,
    height,
    deviceType,
    isTablet,
    isPhone,
    isLandscape,
    isPortrait,
    isLargeTablet,
    isNotebookMode,
    columns,
    contentMaxWidth,
    formMaxWidth,
    select,
    scale,
  };
}
