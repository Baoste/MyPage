import "server-only";

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BCRYPT_COST = 12;
const MAX_PASSWORD_BYTES = 72;
const DUMMY_PASSWORD_HASH = "$2b$12$txSjsniggnYwcxEj2MhF3evimDuE6cuSHIkJXaTSIvdSdwxaovx7C";
const USERNAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}._-]*[\p{L}\p{N}])?$/u;
const ACCOUNT_SCHEMA_ERROR_CODES = new Set([
  "42703",
  "42P01",
  "PGRST200",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

interface PrivateUserRow {
  id: string;
  username: string;
  password_hash: string;
}

interface RegisteredUserRow {
  user_id: string;
  registered_username: string;
}

export interface PrivateAccountIdentity {
  id: string;
  username: string;
}

export class PrivateAccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "invalid-input" | "unavailable" | "username-taken" | "invalid-invitation",
  ) {
    super(message);
    this.name = "PrivateAccountError";
  }
}

function passwordByteLength(password: string) {
  return new TextEncoder().encode(password).byteLength;
}

function normalizedUsername(username: string) {
  return username.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function validatedUsername(value: unknown) {
  if (typeof value !== "string") {
    throw new PrivateAccountError("请输入账号。", 400, "invalid-input");
  }

  const username = value.normalize("NFKC").trim();
  const length = Array.from(username).length;
  if (length < 2 || length > 32 || !USERNAME_PATTERN.test(username)) {
    throw new PrivateAccountError(
      "账号需为 2～32 个字符，可使用中文、字母、数字、点、下划线或短横线，且首尾不能是符号。",
      400,
      "invalid-input",
    );
  }

  return { username, normalized: normalizedUsername(username) };
}

function validatedRegistrationPassword(value: unknown) {
  if (typeof value !== "string") {
    throw new PrivateAccountError("请输入密码。", 400, "invalid-input");
  }

  const characterLength = Array.from(value).length;
  const byteLength = passwordByteLength(value);
  if (characterLength < 8 || byteLength > MAX_PASSWORD_BYTES) {
    throw new PrivateAccountError(
      "密码至少需要 8 个字符，并且不能超过 72 字节。",
      400,
      "invalid-input",
    );
  }
  return value;
}

function invitationDigest(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function isSchemaError(error: { code?: string } | null) {
  return Boolean(error?.code && ACCOUNT_SCHEMA_ERROR_CODES.has(error.code));
}

function assertAccountStorageConfigured() {
  if (!isServerSupabaseConfigured()) {
    throw new PrivateAccountError("账号服务暂时不可用。", 503, "unavailable");
  }
}

export async function authenticatePrivateAccount(
  usernameValue: unknown,
  passwordValue: unknown,
): Promise<PrivateAccountIdentity | null> {
  assertAccountStorageConfigured();

  let username: ReturnType<typeof validatedUsername> | null = null;
  try {
    username = validatedUsername(usernameValue);
  } catch {
    // Keep the response and password verification timing generic for login.
  }

  const password = typeof passwordValue === "string" ? passwordValue : "";
  const passwordWithinLimit = password.length > 0 && passwordByteLength(password) <= MAX_PASSWORD_BYTES;
  const client = createServerSupabaseClient();
  const { data, error } = username
    ? await client
        .from("private_users")
        .select("id,username,password_hash")
        .eq("username_normalized", username.normalized)
        .is("disabled_at", null)
        .maybeSingle()
    : { data: null, error: null };

  if (error) {
    if (isSchemaError(error)) {
      throw new PrivateAccountError("请先执行账号系统数据库 Migration。", 503, "unavailable");
    }
    throw new PrivateAccountError("账号服务暂时不可用。", 503, "unavailable");
  }

  const row = data as PrivateUserRow | null;
  const matches = await bcrypt.compare(
    passwordWithinLimit ? password : "invalid-password",
    row?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  if (!row || !matches) return null;
  return { id: row.id, username: row.username };
}

export async function registerPrivateAccount(
  usernameValue: unknown,
  passwordValue: unknown,
  invitationValue: unknown,
): Promise<PrivateAccountIdentity> {
  assertAccountStorageConfigured();
  const username = validatedUsername(usernameValue);
  const password = validatedRegistrationPassword(passwordValue);
  if (typeof invitationValue !== "string") {
    throw new PrivateAccountError("请输入邀请码。", 400, "invalid-input");
  }
  const invitationCode = invitationValue.normalize("NFKC").trim();
  if (invitationCode.length < 16 || invitationCode.length > 128) {
    throw new PrivateAccountError("邀请码无效或已被使用。", 401, "invalid-invitation");
  }

  const client = createServerSupabaseClient();
  const { data: invitation, error: invitationError } = await client
    .from("private_invites")
    .select("id")
    .eq("code_digest", invitationDigest(invitationCode))
    .maybeSingle();

  if (invitationError) {
    if (isSchemaError(invitationError)) {
      throw new PrivateAccountError("请先执行账号系统数据库 Migration。", 503, "unavailable");
    }
    throw new PrivateAccountError("账号服务暂时不可用。", 503, "unavailable");
  }
  if (!invitation) {
    throw new PrivateAccountError("邀请码无效或已被使用。", 401, "invalid-invitation");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const { data, error } = await client.rpc("register_private_user", {
    invitation_id: (invitation as { id: string }).id,
    account_username: username.username,
    normalized_username: username.normalized,
    account_password_hash: passwordHash,
  });

  if (error) {
    if (error.code === "23505") {
      throw new PrivateAccountError("这个账号已经存在。", 409, "username-taken");
    }
    if (error.code === "P0001" || error.message.includes("INVITATION_UNAVAILABLE")) {
      throw new PrivateAccountError("邀请码无效或已被使用。", 401, "invalid-invitation");
    }
    if (isSchemaError(error)) {
      throw new PrivateAccountError("请先执行账号系统数据库 Migration。", 503, "unavailable");
    }
    throw new PrivateAccountError("暂时无法创建账号。", 503, "unavailable");
  }

  const registered = ((data ?? []) as RegisteredUserRow[])[0];
  if (!registered) {
    throw new PrivateAccountError("暂时无法创建账号。", 503, "unavailable");
  }
  return { id: registered.user_id, username: registered.registered_username };
}
