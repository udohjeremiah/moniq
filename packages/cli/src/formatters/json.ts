import type { Formatter } from "./types.js";

export const jsonFormatter: Formatter = {
  format(report) {
    return `${JSON.stringify(report, undefined, 2)}\n`;
  },
};
