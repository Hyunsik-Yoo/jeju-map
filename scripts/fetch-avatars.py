"""영상에 등장하는 모든 채널의 프로필 이미지·채널명을 유튜브에서 받아온다.

마커가 채널 프로필이라, `channels` 탭(시드 채널)뿐 아니라 **검색 모드로 주워온
영상의 채널**까지 전부 필요하다. 시트 `videos` 탭에는 channel_name이 있지만
스냅샷에서 잘라냈으므로 채널 페이지에서 이름도 같이 뽑는다.

프로필 URL을 그대로 참조하지 않고 파일로 받아둔다 — yt3 URL은 만료·리퍼러
이슈가 있고 마커는 수백 개가 동시에 뜬다.
"""
import html as htmllib
import json
import os
import re
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAYLOAD = os.path.join(ROOT, "scripts", "raw", "sheet-payload.json")
OUT_JSON = os.path.join(ROOT, "scripts", "raw", "avatars.json")
OUT_DIR = os.path.join(ROOT, "public", "channels")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def curl(url: str) -> str:
    return subprocess.run(
        ["curl", "-sL", "-A", UA, "-H", "Accept-Language: ko-KR,ko;q=0.9", url],
        capture_output=True, text=True,
    ).stdout


def find_avatar(page: str) -> str | None:
    candidates = re.findall(r'https://yt3\.googleusercontent\.com/[^"\\\s]+', page)
    if not candidates:
        return None
    # 가장 큰 해상도를 고른 뒤 마커용(176px)으로 맞춰 요청한다.
    best = max(candidates, key=lambda u: int(m.group(1)) if (m := re.search(r"=s(\d+)", u)) else 0)
    return re.sub(r"=s\d+", "=s176", best)


def find_name(page: str) -> str | None:
    # 초기 데이터는 JSON 문자열이라 \uXXXX 이스케이프가 그대로 들어있다.
    # json.loads로 풀어야 한다(unicode_escape는 한글을 깨뜨린다).
    m = re.search(r'"channelMetadataRenderer":\{"title":"((?:[^"\\]|\\.)*)"', page)
    if m:
        try:
            return json.loads(f'"{m.group(1)}"')
        except json.JSONDecodeError:
            pass
    m = re.search(r'<meta property="og:title" content="(.*?)"', page)
    return htmllib.unescape(m.group(1)) if m else None


def main() -> None:
    raw = json.load(open(PAYLOAD, encoding="utf-8"))

    # 시드 채널 + 영상에 실제로 등장한 채널의 합집합.
    seed = {row[0]: {"handle": row[1], "name": row[2]} for row in raw["channels"]}
    targets = dict(seed)
    for _vid, channel_id, *_rest in raw["videos"]:
        targets.setdefault(channel_id, {"handle": "", "name": ""})

    existing = json.load(open(OUT_JSON, encoding="utf-8")) if os.path.exists(OUT_JSON) else {}
    os.makedirs(OUT_DIR, exist_ok=True)

    result = {}
    for channel_id, meta in targets.items():
        path = os.path.join(OUT_DIR, f"{channel_id}.jpg")
        cached = existing.get(channel_id)
        if cached and cached.get("saved") and cached.get("name") and os.path.exists(path):
            result[channel_id] = cached
            continue

        page = curl(f"https://www.youtube.com/channel/{channel_id}")
        avatar, name = find_avatar(page), find_name(page)
        if not avatar and meta["handle"]:
            time.sleep(0.4)
            page = curl(f"https://www.youtube.com/{meta['handle']}")
            avatar, name = find_avatar(page), name or find_name(page)

        if avatar:
            subprocess.run(["curl", "-sL", "-A", UA, "-o", path, avatar], check=False)
        saved = os.path.exists(path) and os.path.getsize(path) > 1000

        result[channel_id] = {
            "name": meta["name"] or name or channel_id,
            "handle": meta["handle"],
            "avatar": avatar,
            "saved": saved,
            "isSeed": channel_id in seed,
        }
        print(f"{'OK  ' if saved else 'MISS'} {result[channel_id]['name']}")
        time.sleep(0.4)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    missing = [v["name"] for v in result.values() if not v["saved"]]
    print(f"\n받음 {len(result) - len(missing)}/{len(result)}" + (f" / 실패: {missing}" if missing else ""))


if __name__ == "__main__":
    main()
