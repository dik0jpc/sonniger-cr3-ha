# Sonniger CR3 — Home Assistant

HACS-интеграция для контроллеров **Sonniger CR3 / MIX EC** по MQTT.

| | |
|---|---|
| **Репозиторий** | [dik0jpc/sonniger-cr3-ha](https://github.com/dik0jpc/sonniger-cr3-ha) |
| **Версия** | **1.0.21** |
| **Требования** | Home Assistant + MQTT (Mosquitto), прошивка платы ≥ **2.1.78** |

---

## Установка

1. В HA уже настроен **MQTT** (Mosquitto).
2. HACS → ⋮ → **Custom repositories** →  
   `https://github.com/dik0jpc/sonniger-cr3-ha` → категория **Integration**.
3. Download **Sonniger CR3** → перезагрузка Home Assistant.
4. **Settings → Devices & services → Add Integration → Sonniger CR3**.
5. Выберите режим **Simple** или **Advanced**.
6. На плате укажите IP брокера MQTT и выключите встроенный Discovery:  
   **HADISC = Off** (с прошивки **2.1.87** достаточно Off на Master).

> После обновления интеграции: **HACS Update → Reload → закройте вкладку HA** и откройте снова (**Ctrl+F5**), иначе в браузере может остаться старый JS подсказок.

---

## Режимы UI

| Режим | CR3 | MIX |
|-------|-----|-----|
| **Simple** | Climate, online / alarm, group role / master / IP | Fan, Circuit enable, online / alarm, group role / master / IP |
| **Advanced** | + температуры, Mode, AFZ, OTA, group… | + ΔT / phase и уставки |

---

## Группа Master / Slave

Управляйте **только Master**.

| | |
|---|---|
| **Slave / Smart + `grp_lock`** | Climate, Number, Switch, Fan — **только чтение** (иконка замка), в т.ч. в роли `wait` и пока задан ID группы |
| **Mode** | всегда можно сменить |
| **Heat target** | диапазон в HA **0…40** (как веб INDEX/MAX; воздух на плате **5…35**) |

В Simple (прошивка ≥ **2.1.93**): сущности **Group role**, **Group master**, **Group master IP**.

---

## Подсказки при наведении

У сущностей Sonniger при наведении показывается **одна** длинная справка (атрибуты `help` / `справка`) — не короткое имя и не чужой текст с соседней строки.

Полный текст также в **Attributes** сущности (more-info).

---

## Сервисы

| Сервис | Назначение |
|--------|------------|
| `sonniger_cr3.ping` | keepalive (`device_id` опционально) |
| `sonniger_cr3.ota` | OTA по URL (`device_id` или `all: true`) |

Прошивка и железо — в приватном репозитории контроллера (не входят в этот пакет).

---

## Иконки

Файлы бренда: `custom_components/sonniger_cr3/brand/`  
(`icon.png`, `logo.png`, варианты `dark_*`).

Home Assistant **2026.3+** отдаёт их сам — отдельный PR в brands-репозиторий не нужен. Обновите интеграцию в HACS, чтобы подтянуть иконки.
