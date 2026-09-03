import { Writable } from "node:stream";
import readline from "node:readline";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const MAXIMUM_PASSWORD_BYTES = 72;

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("This command must be run in an interactive terminal.");
  }

  process.stdout.write(prompt);
  const hiddenOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const interface_ = readline.createInterface({
    input: process.stdin,
    output: hiddenOutput,
    terminal: true,
  });

  return new Promise((resolve, reject) => {
    interface_.once("SIGINT", () => {
      interface_.close();
      process.stdout.write("\n");
      reject(new Error("Cancelled."));
    });
    interface_.question("", (answer) => {
      interface_.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

try {
  const password = await readHidden("Article publish password: ");
  const confirmation = await readHidden("Confirm password: ");
  const passwordBytes = new TextEncoder().encode(password).byteLength;

  if (password !== confirmation) {
    throw new Error("The two passwords do not match.");
  }
  if (Array.from(password).length < 8) {
    throw new Error("Use a password with at least 8 characters.");
  }
  if (passwordBytes > MAXIMUM_PASSWORD_BYTES) {
    throw new Error("The password must not exceed 72 UTF-8 bytes.");
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const dotenvHash = hash.replaceAll("$", "\\$");

  console.log("\nFor .env.local (backslashes prevent Next.js variable expansion):");
  console.log(`ARTICLE_PUBLISH_PASSWORD_HASH=${dotenvHash}`);
  console.log("\nFor a deployment platform environment variable (raw value):");
  console.log(hash);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to hash the password.");
  process.exitCode = 1;
}
