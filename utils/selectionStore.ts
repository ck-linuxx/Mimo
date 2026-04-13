// Singleton store para comunicar seleções entre telas sem estado global pesado.
// Uso típico:
//   Na tela origem: setSelectionCallback('category', (item) => { setSelected(item); })
//   Na tela destino: consumeSelectionCallback('category')?.(selectedItem)

type SelectionCallback<T = unknown> = (item: T) => void;

const callbacks = new Map<string, SelectionCallback>();

export function setSelectionCallback<T>(key: string, callback: SelectionCallback<T>): void {
  callbacks.set(key, callback as SelectionCallback);
}

export function consumeSelectionCallback<T>(key: string): SelectionCallback<T> | undefined {
  const cb = callbacks.get(key) as SelectionCallback<T> | undefined;
  if (cb) callbacks.delete(key);
  return cb;
}
