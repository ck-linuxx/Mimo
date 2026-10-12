import React from 'react';
import { Feather } from '@expo/vector-icons';
import { BANK_LOGO_LOADERS } from './logoLoaders';

export const BANK_ICON_PREFIX = 'bank:';

/** Converte o valor armazenado em `icon` (`bank:<code>`) para o código do banco. */
export function parseBankIcon(icon?: string | null): number | null {
  if (!icon || !icon.startsWith(BANK_ICON_PREFIX)) return null;
  const code = Number(icon.slice(BANK_ICON_PREFIX.length));
  return Number.isFinite(code) ? code : null;
}

export function toBankIcon(code: number): string {
  return `${BANK_ICON_PREFIX}${code}`;
}

type BankLogoProps = {
  code: number;
  size?: number;
  /** Cor do ícone genérico usado quando o banco não possui logo. */
  fallbackColor?: string;
};

/** Renderiza o componente React da logo do banco (carregado sob demanda). */
export const BankLogo = React.memo(function BankLogo({
  code,
  size = 24,
  fallbackColor = '#888',
}: BankLogoProps) {
  const loader = BANK_LOGO_LOADERS[code];

  if (!loader) {
    return <Feather name="briefcase" size={size * 0.85} color={fallbackColor} />;
  }

  const Logo = loader();
  return <Logo width={size} height={size} />;
});

type EntityIconProps = {
  icon?: string | null;
  color: string;
  size?: number;
  fallback?: React.ComponentProps<typeof Feather>['name'];
};

/** Renderiza o logo do banco quando `icon` é `bank:<code>`; senão um ícone Feather. */
export function EntityIcon({ icon, color, size = 20, fallback = 'briefcase' }: EntityIconProps) {
  const code = parseBankIcon(icon);
  if (code != null) return <BankLogo code={code} size={size} fallbackColor={color} />;
  return (
    <Feather
      name={(icon as React.ComponentProps<typeof Feather>['name']) ?? fallback}
      size={size}
      color={color}
    />
  );
}
