# Sonniger CR3 — Home Assistant

HACS-интеграция для контроллеров **Sonniger CR3 / MIX EC** (MQTT).

## Установка

1. В HA уже настроен MQTT (Mosquitto).
2. HACS → ⋮ → **Custom repositories** →  
   `https://github.com/dik0jpc/sonniger-cr3-ha` → категория **Integration**.
3. Download **Sonniger CR3** → перезагрузка HA.
4. Settings → Devices & services → **Add Integration** → **Sonniger CR3**.
5. Режим **Simple** или **Advanced**.
6. На плате укажите IP брокера MQTT. При использовании этой интеграции выключите встроенный MQTT Discovery на плате (**HADISC = Off**, прошивка ≥ 2.1.78).

## Режимы

| Режим | CR3 | MIX |
|-------|-----|-----|
| Simple | Climate + online/alarm | Fan + Circuit enable + online/alarm |
| Advanced | + температуры, Mode, AFZ, OTA, group… | + ΔT/phase и уставки |

## Сервисы

- `sonniger_cr3.ping` — keepalive
- `sonniger_cr3.ota` — OTA по URL (`device_id` или `all: true`)

Прошивка и железо: приватный репозиторий контроллера (не входит в этот пакет).
