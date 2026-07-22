import type { SelectField } from "@kyro-cms/core";
import { getCountriesByRegion, getAllCountries } from "../data/countries.js";

export interface CountryFieldOptions {
  name?: string;
  dependsOn?: string;
  label?: string;
  required?: boolean;
}

export function CountryField(options: CountryFieldOptions = {}): SelectField {
  const { 
    name = "country", 
    dependsOn = "region", 
    label = "Country", 
    required = false 
  } = options;

  return {
    name,
    type: "select",
    label,
    required,
    options: ({ data, siblingData }) => {
      const region = siblingData?.[dependsOn] || data?.[dependsOn];
      
      if (region && typeof region === "string") {
        return getCountriesByRegion(region);
      }
      
      return getAllCountries(); 
    }
  };
}
