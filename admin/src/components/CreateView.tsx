import { useState } from "react";
import { apiPost } from "../lib/api";
import type { KyroConfig, CollectionConfig } from "@kyro-cms/core/client";
import { AutoForm } from "./AutoForm";
import { Spinner } from "./ui/Spinner";
import { PageHeader } from "./ui/PageHeader";
import { adminPath } from "../lib/paths";
import { toast } from "../lib/stores";


interface CreateViewProps {
  config: KyroConfig;
  collection: CollectionConfig;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function CreateView({
  config,
  collection,
  onCancel,
  onSuccess,
  onError,
}: CreateViewProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const fields = collection.fields || [];
  const label = collection.label || collection.slug;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      setSaving(true);
      await apiPost(`/api/${collection.slug}`, data);
      toast.success(`${collection.singularLabel || collection.label || "Document"} created`);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kyro-detail">
      <PageHeader
        back={{ onClick: onCancel }}
        breadcrumbs={[
          { label: "Collections" },
          { label: label, href: `${adminPath}/${collection.slug}` },
          { label: "New" }
        ]}
        title={`Create ${collection.singularLabel || label}`}
        action={{
          label: saving ? "Creating..." : `Create ${collection.singularLabel || label}`,
          onClick: () => handleSubmit(),
          disabled: saving,
        }}

      />


      <div className="kyro-detail-body">
        <div className="kyro-card">
          <div className="kyro-card-content">
            <form>
              <AutoForm
                config={{ ...collection, fields }}
                data={data}
                onChange={setData}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
