import { styleText } from "node:util";

const colorFns: ((s: string) => string)[] = [
  (s) => styleText("cyan", s),
  (s) => styleText("magenta", s),
  (s) => styleText("green", s),
  (s) => styleText("yellow", s),
  (s) => styleText("blue", s),
];

const letterRows: string[][] = [
  // M
  [
    "███╗   ███╗",
    "████╗ ████║",
    "██╔████╔██║",
    "██║╚██╔╝██║",
    "██║ ╚═╝ ██║",
    "╚═╝     ╚═╝",
  ],
  // O
  [
    " ██████╗ ",
    "██╔═══██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ],
  // N
  [
    "███╗   ██╗",
    "████╗  ██║",
    "██╔██╗ ██║",
    "██║╚██╗██║",
    "██║ ╚████║",
    "╚═╝  ╚═══╝",
  ],
  // I
  ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  // Q
  [
    " ██████╗ ",
    "██╔═══██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██████╔╝",
    " ╚════╝╗ ",
  ],
];

const DESCRIPTION =
  "Policy-driven workspace linter for JavaScript/TypeScript monorepos.";

export function renderBanner(): string {
  const lines: string[] = [""];

  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    lines.push(assembleRow(rowIndex));
  }

  const description = styleText("bold", DESCRIPTION);

  lines.push(description, "");

  return lines.join("\n");
}

function assembleRow(rowIndex: number): string {
  let row = "";

  for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
    row += rowPart(columnIndex, rowIndex);
    if (columnIndex < 4) {
      row += "  ";
    }
  }

  return row;
}

function rowPart(columnIndex: number, rowIndex: number): string {
  const rows = letterRows.at(columnIndex);
  const colorFunction = colorFns.at(columnIndex);
  if (rows === undefined || colorFunction === undefined) return "";

  const line = rows.at(rowIndex);
  return line === undefined ? "" : colorFunction(line);
}
