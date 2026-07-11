import { blue, cyan, green, magenta, yellow } from "yoctocolors";

const colorFns: ((s: string) => string)[] = [
  cyan,
  magenta,
  green,
  yellow,
  blue,
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
  const combinedWidth = 50;
  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    lines.push(assembleRow(rowIndex));
  }

  const description = centerPad(DESCRIPTION, combinedWidth + 12);

  lines.push("", description);

  return lines.join("\n");
}

function assembleRow(rowIndex: number): string {
  const indent = " ".repeat(6);
  let row = indent;

  for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
    row += rowPart(columnIndex, rowIndex);
    if (columnIndex < 4) {
      row += "  ";
    }
  }

  return row;
}

function centerPad(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

function rowPart(columnIndex: number, rowIndex: number): string {
  const rows = letterRows.at(columnIndex);
  const colorFunction = colorFns.at(columnIndex);
  if (rows === undefined || colorFunction === undefined) return "";

  const line = rows.at(rowIndex);
  return line === undefined ? "" : colorFunction(line);
}
