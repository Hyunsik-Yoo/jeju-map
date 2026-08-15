// 구글시트 접근 (서비스 계정 JWT → access token → Sheets REST).
// 외부 라이브러리 없이 node:crypto로 RS256 서명한다. 서버 전용.
import { createSign } from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

let cached: { token: string; expiresAt: number } | null = null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_* env가 없습니다');

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`토큰 발급 실패: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

function sheetsUrl(path: string): string {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error('SHEET_ID env가 없습니다');
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`;
}

/** 범위 값 읽기 (예: "video_requests!A2:F"). */
export async function readRange(range: string): Promise<string[][]> {
  const token = await getAccessToken();
  const res = await fetch(sheetsUrl(`/values/${encodeURIComponent(range)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`시트 읽기 실패: ${res.status}`);
  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

/** 시트 끝에 행 추가. */
export async function appendRow(range: string, row: (string | number)[]): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    sheetsUrl(`/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error(`시트 쓰기 실패: ${res.status}`);
}
