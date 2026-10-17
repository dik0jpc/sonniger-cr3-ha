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

Управляйте **Master**. У Slave/Smart при `grp_lock` (в т.ч. `wait` / пока есть ID группы) Climate / Number / Switch / Fan **read-only** (иконка замка). Mode остаётся доступен. Heat target в HA: **0…40** (как на веб-UI INDEX/MAX; воздух 5…35).

С **1.0.8** (прошивка ≥ **2.1.93**): в Simple видны **Group role**, **Group master**, **Group master IP**.

С **1.0.17**: при наведении длинная справка (`help` / `справка`) подставляется **в тот же** родной tip, где было имя («OTA status» и т.п.) — без второго окна сзади.

С **1.0.18**: Slave/Smart с `grp_lock` нельзя крутить Heat target (в т.ч. в `wait`); потолок Heat target / Climate **40** (не 100). После обновления: HACS Update → Reload → закройте вкладку HA + Ctrl+F5.

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
