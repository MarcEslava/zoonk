"use client";

import { useState } from "react";

/**
 * Holds the content a reviewer is editing and follows the server's copy when it
 * changes: after a discard the form returns to the approved content, and after
 * a save it shows what was stored. The editor is not remounted for this, so
 * the save's confirmation message stays on screen.
 */
export function useStepContent<TContent>(content: TContent) {
  const source = JSON.stringify(content);
  const [state, setState] = useState({ source, value: content });

  if (state.source !== source) {
    setState({ source, value: content });
  }

  const value = state.source === source ? state.value : content;

  return [value, (next: TContent) => setState({ source, value: next })] as const;
}
