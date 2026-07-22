import { describe, it, expect } from "vitest";

describe("Selection Manager Logic", () => {
  function createSelectionHelper(initialIds: string[] = []) {
    let set = new Set<string>(initialIds);

    return {
      get selectedIds() {
        return set;
      },
      get count() {
        return set.size;
      },
      selectOne(id: string) {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      },
      selectAll(ids: string[]) {
        if (set.size === ids.length && ids.every((id) => set.has(id))) {
          set = new Set();
        } else {
          set = new Set(ids);
        }
      },
      clear() {
        set = new Set();
      },
      isSelected(id: string) {
        return set.has(id);
      },
    };
  }

  it("toggles item selection state", () => {
    const selection = createSelectionHelper();
    expect(selection.count).toBe(0);

    selection.selectOne("doc-1");
    expect(selection.isSelected("doc-1")).toBe(true);
    expect(selection.count).toBe(1);

    selection.selectOne("doc-1");
    expect(selection.isSelected("doc-1")).toBe(false);
    expect(selection.count).toBe(0);
  });

  it("selects all items and toggles off if all are selected", () => {
    const selection = createSelectionHelper();
    const ids = ["doc-1", "doc-2", "doc-3"];

    selection.selectAll(ids);
    expect(selection.count).toBe(3);
    expect(selection.isSelected("doc-2")).toBe(true);

    selection.selectAll(ids);
    expect(selection.count).toBe(0);
  });
});
