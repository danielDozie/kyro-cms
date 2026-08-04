import React from "react";
import type { Field } from "@kyro-cms/core/client";

export interface FieldRenderContext {
  field: Field;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  disabled?: boolean;
  formData?: Record<string, unknown>;
  siblingData?: Record<string, unknown>;
  collectionSlug?: string;
  globalSlug?: string;
}

export type FieldStrategy = (context: FieldRenderContext) => React.ReactNode;

/**
 * Strategy Pattern Registry for Admin Form Field Renderers.
 * Allows pluggable, dynamic registering of field input renderers.
 */
class FieldStrategyRegistryClass {
  private strategies = new Map<string, FieldStrategy>();

  /**
   * Register a rendering strategy for a given field type (e.g. 'text', 'relationship', 'richText', etc.)
   */
  register(type: string, strategy: FieldStrategy): void {
    this.strategies.set(type, strategy);
  }

  /**
   * Retrieve a rendering strategy for a field type.
   */
  get(type: string): FieldStrategy | undefined {
    return this.strategies.get(type);
  }

  /**
   * Check if a custom strategy exists for a given field type.
   */
  has(type: string): boolean {
    return this.strategies.has(type);
  }
}

export const FieldStrategyRegistry = new FieldStrategyRegistryClass();
