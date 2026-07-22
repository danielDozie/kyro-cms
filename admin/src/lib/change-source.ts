let _lastChangeSource: "keystroke" | "other" = "other";

export function getLastChangeSource(): "keystroke" | "other" {
  return _lastChangeSource;
}

export function setChangeSource(source: "keystroke" | "other"): void {
  _lastChangeSource = source;
}
