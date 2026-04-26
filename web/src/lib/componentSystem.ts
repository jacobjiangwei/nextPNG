import type { NpngElement, ComponentDef, ComponentInstanceElement } from "./types";

type MutableElement = NpngElement & Record<string, unknown>;

export function resolveInstance(
  instance: ComponentInstanceElement,
  components: ComponentDef[]
): NpngElement | null {
  const compDef = components.find(c => c.id === instance.component_id);
  if (!compDef) return null;
  const resolved = structuredClone(compDef.master) as MutableElement;
  // Apply positional overrides from instance
  if (instance.x !== undefined) resolved.x = instance.x;
  if (instance.y !== undefined) resolved.y = instance.y;
  if (instance.width !== undefined) resolved.width = instance.width;
  if (instance.height !== undefined) resolved.height = instance.height;
  // Apply property overrides
  if (instance.overrides) {
    for (const [k, v] of Object.entries(instance.overrides)) {
      resolved[k] = v;
    }
  }
  // Apply element-level styling
  if (instance.fill !== undefined) resolved.fill = instance.fill;
  if (instance.stroke !== undefined) resolved.stroke = instance.stroke;
  if (instance.opacity !== undefined) resolved.opacity = instance.opacity;
  if (instance.transform !== undefined) resolved.transform = instance.transform;
  return resolved as NpngElement;
}
