import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function promptForPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    const readline = createInterface({ input: stdin, output: stdout });
    try {
      return await readline.question("Private site password: ");
    } finally {
      readline.close();
    }
  }

  stdout.write("Private site password: ");
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      resolve(password);
    };

    const onData = (input) => {
      for (const character of input) {
        if (character === "\u0003") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        password += character;
        stdout.write("•");
      }
    };

    stdin.on("data", onData);
  });
}

const cliPassword = process.argv[2];

try {
  const password = cliPassword ?? (await promptForPassword());

  if (password.length < 7) {
    throw new Error("Use a password with at least 7 characters.");
  }

  const hash = await bcrypt.hash(password, 12);
  stdout.write(`${hash}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unable to create hash.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
