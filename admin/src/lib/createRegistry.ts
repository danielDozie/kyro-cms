export interface RegistryItem {
  id: string;
}

export function createRegistry<T extends RegistryItem>(validate?: (item: T) => void) {
  const items = new Map<string, T>();

  return {
    register(item: T) {
      if (items.has(item.id)) {
        console.warn(`Item with id "${item.id}" is already registered. Overwriting.`);
      }
      validate?.(item);
      items.set(item.id, item);
    },

    unregister(id: string) {
      items.delete(id);
    },

    get(id: string): T | undefined {
      return items.get(id);
    },

    getAll(): T[] {
      return Array.from(items.values());
    },
  };
}
