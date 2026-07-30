import type { Formatter } from "../format.js";

export const jsonFormatter: Formatter = {
  format(report) {
    return `${JSON.stringify(report, undefined, 2)}\n`;
  },
};
