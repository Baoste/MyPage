import { createHash, randomBytes } from "node:crypto";

const invitationCode = randomBytes(24).toString("base64url");
const codeDigest = createHash("sha256").update(invitationCode, "utf8").digest("hex");

console.log("Invitation code (send this to the invitee once):");
console.log(invitationCode);
console.log("");
console.log("SHA-256 digest (store this in private_invites.code_digest):");
console.log(codeDigest);
