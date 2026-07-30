import { styleText } from "node:util";

const BANNER = `\
,---.    ,---.    ,-----.    ,---.   .--..-./\`)     ,-----.
|    \\  /    |  .'  .-,  '.  |    \\  |  |\\ .-.')  .'  .-,  '.
|  ,  \\/  ,  | / ,-.|  \\ _ \\ |  ,  \\ |  |/ \`-' \\ / ,-.|  \\ _ \\
|  |\\_   /|  |;  \\  '_ /  | :|  |\\_ \\|  | \`-'\`"\`;  \\  '_ /  | :
|  _( )_/ |  ||  _\`,/ \\ _/  ||  _( )_\\  | .---. |  _\`,/ \\ _/  |
| (_ o _) |  |: (  '\\_/ \\   ;| (_ o _)  | |   | : (  '\\_/ \\   ;
|  (_,_)  |  | \\ \`"/  \\  ) / |  (_,_)\\  | |   |  \\ \`"/  \\  )  \\
|  |      |  |  '. \\_/\`\`".'  |  |    |  | |   |   '. \\_/\`\`"/)  )
'--'      '--'    '-----'    '--'    '--' '---'     '-----' \`-'`;

const DESCRIPTION =
  "Policy-driven workspace linter for JavaScript/TypeScript monorepos.";

export function renderBanner() {
  return (
    "\n" +
    styleText("magenta", BANNER) +
    "\n" +
    styleText("bold", DESCRIPTION) +
    "\n"
  );
}
