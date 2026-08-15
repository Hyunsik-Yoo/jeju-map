"""시트 원본 스냅샷(scripts/raw/sheet-payload.json) → 앱이 읽는 src/data/jeju.json.

시트는 비공개라 런타임에 못 읽는다. 수집 스킬이 시트를 갱신한 뒤
scripts/README.md의 절차로 스냅샷을 다시 받고 이 스크립트를 돌리면 된다.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "raw", "sheet-payload.json")
AVATARS = os.path.join(ROOT, "scripts", "raw", "avatars.json")
OUT = os.path.join(ROOT, "src", "data", "jeju.json")


def num(value: str):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def main() -> None:
    raw = json.load(open(SRC, encoding="utf-8"))
    avatars = json.load(open(AVATARS, encoding="utf-8")) if os.path.exists(AVATARS) else {}

    # 채널 마스터는 avatars.json 기준이다. `channels` 탭은 크롤 시드만 담고 있어서
    # 검색 모드로 주워온 영상의 채널이 빠진다 — 마커가 채널 프로필이라 전부 필요하다.
    seed_category = {row[0]: row[3] for row in raw["channels"]}
    channels = {}
    for channel_id, info in avatars.items():
        channels[channel_id] = {
            "id": channel_id,
            "name": info.get("name") or channel_id,
            "handle": info.get("handle") or "",
            "category": seed_category.get(channel_id),
            "avatar": f"/channels/{channel_id}.jpg" if info.get("saved") else None,
        }

    videos = {}
    for video_id, channel_id, title, url, published_at, duration, views, likes in raw["videos"]:
        videos[video_id] = {
            "id": video_id,
            "channelId": channel_id,
            "title": title,
            "url": url or f"https://www.youtube.com/watch?v={video_id}",
            "publishedAt": published_at,
            "durationSec": num(duration),
            "viewCount": num(views),
            "likeCount": num(likes),
            "placeKeys": [],
        }

    places = {}
    for row in raw["places"]:
        (key, name, place_type, category, address, region,
         lat, lng, kakao_id, open_start, open_end) = row
        if not lat or not lng:
            continue  # 좌표가 없으면 지도에 못 올린다.
        places[key] = {
            "key": key,
            "name": name,
            "type": place_type or "RESTAURANT",
            "category": category,
            "address": address,
            "region": region,
            "lat": float(lat),
            "lng": float(lng),
            "kakaoId": kakao_id or None,
            "openStart": open_start or None,
            "openEnd": open_end or None,
            "videos": [],
        }

    # place_videos: 장소 ⇄ 영상 N:M. 양쪽에 모두 걸어둔다.
    # 같은 (장소, 영상) 쌍이 시트에 중복돼 있어도 한 번만 센다(출연 횟수 왜곡 방지).
    seen_pairs = set()
    for key, video_id, featured_menu, context in raw["links"]:
        place = places.get(key)
        if not place or video_id not in videos:
            continue
        if (key, video_id) in seen_pairs:
            continue
        seen_pairs.add((key, video_id))
        place["videos"].append({
            "videoId": video_id,
            "featuredMenu": featured_menu or None,
            "context": context or None,
        })
        videos[video_id]["placeKeys"].append(key)

    menus = {}
    for key, menu_name, menu_count, menu_price, menu_category in raw.get("menus", []):
        menus.setdefault(key, []).append({
            "name": menu_name,
            "count": num(menu_count),
            "price": num(menu_price),
            "category": menu_category or None,
        })
    for key, items in menus.items():
        if key in places:
            places[key]["menus"] = items

    # 장소가 하나도 안 붙은 영상은 화면에 띄울 게 없으니 뺀다(원장에는 남아 있다).
    kept_videos = [v for v in videos.values() if v["placeKeys"]]
    kept_videos.sort(key=lambda v: (v["publishedAt"] or "", v["id"]), reverse=True)

    used_channels = {v["channelId"] for v in kept_videos}
    orphan_places = [p["key"] for p in places.values() if not p["videos"]]

    out = {
        "fetchedAt": raw["fetchedAt"],
        "channels": [channels[c] for c in sorted(used_channels) if c in channels],
        "videos": kept_videos,
        "places": [p for p in places.values() if p["videos"]],
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"channels {len(out['channels'])} / videos {len(out['videos'])} / places {len(out['places'])}")
    print(f"제외 — 장소 없는 영상 {len(videos) - len(kept_videos)}, 영상 없는 장소 {len(orphan_places)}")
    print(f"→ {OUT} ({os.path.getsize(OUT):,} bytes)")


if __name__ == "__main__":
    main()
