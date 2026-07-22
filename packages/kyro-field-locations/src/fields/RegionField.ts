import type { SelectField } from "@kyro-cms/core";
import { REGIONS } from "../data/regions.js";

export interface RegionFieldOptions {
  name?: string;
  label?: string;
  required?: boolean;
}

export function RegionField(options: RegionFieldOptions = {}): SelectField {
  const { 
    name = "region", 
    label = "Region", 
    required = false 
  } = options;

  return {
    name,
    type: "select",
    label,
    required,
    options: REGIONS,
  };
}
