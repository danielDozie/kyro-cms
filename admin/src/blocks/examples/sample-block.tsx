import React from "react";
import type { KyroBlock } from "../types.ts";
import { registerBlock } from "../registry.ts";

const SampleBlockRenderer: KyroBlock["render"] = (props) => {
  const { data } = props;
  return (
    <div style={{ border: "1px solid #ccc", padding: 8, borderRadius: 6 }}>
      <strong>Sample Block</strong>
      <pre style={{ marginTop: 6 }}>{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  );
};

const block: KyroBlock = {
  id: "sample-block",
  label: "Sample Block",
  category: "demo",
  schema: [{ name: "title", label: "Title", type: "text", required: true }],
  render: SampleBlockRenderer,
};

registerBlock(block);

export default block;
export { block as sampleBlock };
