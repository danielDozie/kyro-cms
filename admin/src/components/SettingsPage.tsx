import { AutoForm } from "./AutoForm";
import { toast } from "../lib/stores";

interface SettingsPageProps {
  config: any;
  globalSlug?: string;
  data?: Record<string, unknown>;
  layout?: "split" | "single";
}

export function SettingsPage(props: SettingsPageProps) {
  return (
    <AutoForm
      {...props}
      onActionSuccess={(msg: string) => {
        toast.success(msg);
      }}
      onActionError={(msg: string) => toast.error(msg)}
    />
  );
}
