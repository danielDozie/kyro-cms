import { useEffect, useMemo, useState } from "react";
import {
  collectStudioReferences,
  resolveStudioReferences,
  type StudioBlock,
  type StudioContext,
} from "@kyro-cms/studio";
import { apiGet } from "../../lib/api";
export function useStudioReferences(blocks: StudioBlock[]): StudioContext {
  const signature = JSON.stringify(collectStudioReferences(blocks));
  const [references, setReferences] = useState<Map<string, Record<string, any>>>(new Map());
  useEffect(() => {
    let active = true;
    void resolveStudioReferences(blocks, async (collection, id) => {
      const result = await apiGet<{ data?: Record<string, any> }>(
        `/api/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?depth=1`,
        { autoToast: false },
      );
      return result.data;
    }).then((refs) => {
      if (active) setReferences(refs);
    });
    return () => {
      active = false;
    };
  }, [signature]);
  return useMemo(() => ({ references }), [references]);
}
