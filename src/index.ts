import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as qs from "querystring";

const LOGIN_URL = "https://challenge.sunvoy.com/login";
const USERS_URL = "https://challenge.sunvoy.com/api/users";
const SETTINGS_URL = "https://api.challenge.sunvoy.com/api/settings";

async function NoncePaylaod(): Promise<string> {
  const response = await fetch(LOGIN_URL);
  const html = await response.text();
  const $ = cheerio.load(html);
  const nonce = $('input[name="nonce"]').val();
  if (!nonce) throw new Error("Nonce is not available");
  return nonce.toString();
}

async function login(): Promise<string> {
  const nonce = await NoncePaylaod();

  const formData = qs.stringify({
    nonce,
    username: "demo@example.org",
    password: "test",
  });

  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": formData.length.toString(),
    },
    body: formData,
    redirect: "manual",
  });

  if (response.status !== 302) {
    throw new Error(`Unable to login with status ${response.status}`);
  }

  const cookies = response.headers.raw()["set-cookie"];
  if (!cookies || cookies.length === 0)
    throw new Error("Sesssion cookie not found in response headers");
  console.log("Login successful, cookies received:", cookies);

  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function fetchUsers(cookie: string) {
  const res = await fetch(USERS_URL, {
    headers: {
      Cookie: cookie,
    },
  });
  console.log(`Fetch ${USERS_URL} →`, res.status, await res.clone().text());
  if (!res.ok) {
    throw new Error(
      `Falied to get users in here___(${res.status}): ${res.statusText}`
    );
  }
  return res.json();
}

async function fetchAuthenticatedUser(cookie: string) {
  const response = await fetch(SETTINGS_URL, {
    headers: {
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to authenticated___ ${response.statusText}`);
  }

  return await response.json();
}

async function main() {
  try {
    const sessionCookie = await login();
    const users = await fetchUsers(sessionCookie);
    const currentUser = await fetchAuthenticatedUser(sessionCookie);

    const output = {
      users,
      authenticatedUser: currentUser,
    };

    fs.writeFileSync("users.json", JSON.stringify(output, null, 2));
    console.log("✅ users.json saved successfully.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
