/* eslint-disable unicorn/prefer-string-raw */

import { styleText } from "node:util";

const BANNER_ROWS = [
  ",---.    ,---.    ,-----.    ,---.   .--..-./`)     ,-----.",
  "|    \\  /    |  .'  .-,  '.  |    \\  |  |\\ .-.')  .'  .-,  '.",
  "|  ,  \\/  ,  | / ,-.|  \\ _ \\ |  ,  \\ |  |/ `-' \\ / ,-.|  \\ _ \\",
  "|  |\\_   /|  |;  \\  '_ /  | :|  |\\_ \\|  | `-'`\"`;  \\  '_ /  | :",
  "|  _( )_/ |  ||  _`,/ \\ _/  ||  _( )_\\  | .---. |  _`,/ \\ _/  |",
  "| (_ o _) |  |: (  '\\_/ \\   ;| (_ o _)  | |   | : (  '\\_/ \\   ;",
  '|  (_,_)  |  | \\ `"/  \\  ) / |  (_,_)\\  | |   |  \\ `"/  \\  )  \\',
  "|  |      |  |  '. \\_/``\".'  |  |    |  | |   |   '. \\_/``\"/)  )",
  "'--'      '--'    '-----'    '--'    '--' '---'     '-----' `-'",
];

const DESCRIPTION =
  "Policy-driven workspace linter for JavaScript/TypeScript monorepos.";

export function renderBanner() {
  const lines = [""];

  for (const row of BANNER_ROWS) {
    lines.push(styleText("cyan", row));
  }

  const description = styleText("bold", DESCRIPTION);

  lines.push(description, "");

  return lines.join("\n");
}
