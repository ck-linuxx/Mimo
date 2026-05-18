# Regra: `className` como padrão — `style` somente quando necessário

## Obrigatório

Use sempre `className` com os tokens NativeWind para layout, espaçamento, cores e tipografia.
Use `style={{}}` **somente** quando `className` não alcança o caso.

---

## Casos em que `style` é permitido

| Caso | Exemplo |
|---|---|
| Prop `color` de ícone `Feather` (não aceita classe) | `<Feather color={colors.primaryGold} />` |
| Valor animado (`useAnimatedStyle`, `withSpring`) | `style={animStyle}` ou `style={[animStyle]}` |
| Cor computada dinamicamente de dado do banco | `style={{ color: category.color }}` |
| Propriedade sem equivalente Tailwind | `style={{ maxWidth: 400 }}` |
| `rgba` de overlay sem token de tema (ex: backdrop de modal) | `style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}` — combine com `className="absolute inset-0"` |
| `Image` dimensionada com `width: '100%'` dentro de container fixo | `style={{ width: '100%', height: '100%' }}` — alternativa: `className="w-full h-full"` |

---

## Proibido

```tsx
// ❌ Nunca hardcode hex ou rgba em className
<View className="bg-[#1A1A1A]" />
<View style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />  // use token

// ❌ Nunca use style para coisas que className suporta
<View style={{ flexDirection: 'row', gap: 8, padding: 16 }} />
<Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }} />
```

---

## Tokens de cores (camelCase → className)

| `colors.ts` | `className` |
|---|---|
| `background` | `bg-light-background dark:bg-dark-background` |
| `cardBackground` | `bg-light-card-background dark:bg-dark-card-background` |
| `iconBackground` | `bg-light-icon-background dark:bg-dark-icon-background` |
| `borderColor` | `border border-light-border-color dark:border-dark-border-color` |
| `textPrimary` | `text-light-text-primary dark:text-dark-text-primary` |
| `textSecondary` | `text-light-text-secondary dark:text-dark-text-secondary` |
| `primaryGold` | `bg-light-primary-gold dark:bg-dark-primary-gold` |
| `primaryGold` + `'20'` | `bg-light-primary-gold/20 dark:bg-dark-primary-gold/20` |
| `incomeColor` | `bg-light-income-color dark:bg-dark-income-color` |
| `incomeColor` + `'20'` | `bg-light-income-color/20 dark:bg-dark-income-color/20` |
| `expenseColor` | `bg-light-expense-color dark:bg-dark-expense-color` |
| `expenseColor` + `'20'` | `bg-light-expense-color/20 dark:bg-dark-expense-color/20` |

---

## Animated.View — padrão correto

Estilos estáticos vão em `className`, valores animados vão em `style`:

```tsx
// ✅ Correto
<Animated.View
  className="bg-light-card-background dark:bg-dark-card-background rounded-t-3xl p-6"
  style={sheetStyle}
/>

// ✅ Overlay de modal — rgba sem token fica em style; posicionamento vai em className
<Animated.View
  className="absolute inset-0"
  style={[{ backgroundColor: 'rgba(0,0,0,0.5)' }, overlayStyle]}
/>

// ❌ Errado — mistura tudo em style
<Animated.View
  style={[{
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
  }, sheetStyle]}
/>
```

---

## Mapeamento rápido de valores comuns

| `style` valor | `className` |
|---|---|
| `flexDirection: 'row'` | `flex-row` |
| `flex: 1` | `flex-1` |
| `alignItems: 'center'` | `items-center` |
| `justifyContent: 'center'` | `justify-center` |
| `justifyContent: 'flex-end'` | `justify-end` |
| `justifyContent: 'space-between'` | `justify-between` |
| `overflow: 'hidden'` | `overflow-hidden` |
| `gap: 8` | `gap-2` |
| `gap: 12` | `gap-3` |
| `gap: 14` | `gap-3.5` |
| `gap: 16` | `gap-4` |
| `padding: 12` | `p-3` |
| `padding: 16` | `p-4` |
| `padding: 24` | `p-6` |
| `paddingBottom: 40` | `pb-10` |
| `marginBottom: 8` | `mb-2` |
| `marginBottom: 20` | `mb-5` |
| `marginTop: 2` | `mt-0.5` |
| `width: 32, height: 32` | `w-8 h-8` |
| `width: 40, height: 40` | `w-10 h-10` |
| `width: 48, height: 48` | `w-12 h-12` |
| `width: 56, height: 56` | `w-14 h-14` |
| `borderRadius: 8` | `rounded-lg` |
| `borderRadius: 10` | `rounded-[10px]` |
| `borderRadius: 12` | `rounded-xl` |
| `borderRadius: 16` | `rounded-2xl` |
| `borderRadius: 24` | `rounded-3xl` |
| `borderRadius: 999` | `rounded-full` |
| `borderTopLeftRadius + borderTopRightRadius: 24` | `rounded-t-3xl` |
| `fontWeight: '500'` | `font-medium` |
| `fontWeight: '600'` | `font-semibold` |
| `fontWeight: '700'` | `font-bold` |
| `fontSize: 12` | `text-xs` |
| `fontSize: 14` | `text-sm` |
| `fontSize: 15` | `text-[15px]` |
| `fontSize: 16` | `text-base` |
| `fontSize: 20` | `text-xl` |
| `position: 'absolute', top: 0, right: 0, bottom: 0, left: 0` | `absolute inset-0` |
