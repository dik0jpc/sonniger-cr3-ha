# Sonniger CR3 — Home Assistant

HACS-интеграция для контроллеров **Sonniger CR3 / MIX EC** (MQTT).

## Установка

1. В HA уже настроен MQTT (Mosquitto).
2. HACS → ⋮ → **Custom repositories** →  
   `https://github.com/dik0jpc/sonniger-cr3-ha` → категория **Integration**.
3. Download **Sonniger CR3** → перезагрузка HA.
4. Settings → Devices & services → **Add Integration** → **Sonniger CR3**.
5. Режим **Simple** или **Advanced**.
6. На плате укажите IP брокера MQTT. При использовании этой интеграции выключите встроенный MQTT Discovery на плате (**HADISC = Off**, прошивка ≥ 2.1.78; с 2.1.87 достаточно Off на Master).

## Группа Master / Slave (1.0.7+)

Управляйте **Master**. У Slave/Smart в `follow` + `grp_lock` поля Climate / Number / Switch / Fan **read-only** (иконка замка). Mode остаётся доступен.

С **1.0.8** (прошивка ≥ **2.1.93**): в Simple видны **Group role**, **Group master**, **Group master IP** — кто сейчас master и его Ethernet IP. На mastering-плате поля указывают на себя.

С **1.0.9**: у каждой сущности подробная справка (атрибут `description`, язык интерфейса HA RU/EN) — что это, как работает, значения по умолчанию. При наведении курсора — tooltip; полный текст также в карточке сущности (more-info). После обновления сделайте жёсткое обновление страницы HA (Ctrl+F5), чтобы подтянуть `tooltips.js`.

## Режимы

| Режим | CR3 | MIX |
|-------|-----|-----|
| Simple | Climate + online/alarm + group role/master/IP | Fan + Circuit enable + online/alarm + group role/master/IP |
| Advanced | + температуры, Mode, AFZ, OTA, group… | + ΔT/phase и уставки |

## Сервисы

- `sonniger_cr3.ping` — keepalive
- `sonniger_cr3.ota` — OTA по URL (`device_id` или `all: true`)

Прошивка и железо: приватный репозиторий контроллера (не входит в этот пакет).

## Icon

Fan brand images live in `custom_components/sonniger_cr3/brand/` (`icon.png`, `logo.png`, and `dark_*` variants). Home Assistant 2026.3+ serves them automatically — no brands repo PR needed. Update the integration in HACS to pick them up.
