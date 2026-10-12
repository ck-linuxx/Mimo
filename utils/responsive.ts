import { BREAKPOINTS } from 'hooks/useBreakpoint';

export { BREAKPOINTS };

export function isTabletWidth(width: number): boolean {
  return width >= BREAKPOINTS.TABLET_MIN;
}

export function getResponsiveMaxWidth(
  width: number,
  type: 'form' | 'content' = 'content'
): number | undefined {
  if (width < BREAKPOINTS.TABLET_MIN) {
    return undefined;
  }
  if (type === 'form') {
    return 640;
  }
  return width >= BREAKPOINTS.LARGE_TABLET_MIN ? 1120 : 840;
}

