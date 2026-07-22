import React from "react";
import type { KyroBlock } from "../types.ts";
import { registerBlock } from "../registry.ts";

const SampleBlock2Renderer: KyroBlock["render"] = (props) => {
  const { data } = props;
  return (
    <div style={{ border: "2px dashed #888", padding: 10, borderRadius: 8 }}>
      <strong>Sample Block 2</strong>
      <pre style={{ marginTop: 6 }}>{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  );
};

const block: KyroBlock = {
  id: "sample-block-2",
  label: "Sample Block 2",
  category: "demo",
  schema: [
    { name: "subtitle", label: "Subtitle", type: "text", required: false },
  ],
  render: SampleBlock2Renderer,
};

registerBlock(block);
export default block;
export { block as sampleBlock2 };
