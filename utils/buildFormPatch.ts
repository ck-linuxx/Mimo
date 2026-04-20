/**
 * Extrai apenas os campos alterados de um TanStack Form usando `fieldMeta.isDefaultValue`.
 *
 * `isDefaultValue === false` significa que o valor atual difere do `defaultValues` —
 * flag correto para construção de PATCH (não-persistente: valor real vs default).
 */
export function buildFormPatch<T extends Record<string, unknown>>(
  fieldMeta: Record<string, { isDefaultValue: boolean }>,
  value: T,
): Partial<T> {
  return Object.entries(fieldMeta).reduce(
    (acc, [fieldName, meta]) => {
      if (!meta.isDefaultValue) {
        acc[fieldName as keyof T] = value[fieldName as keyof T];
      }
      return acc;
    },
    {} as Partial<T>,
  );
}
