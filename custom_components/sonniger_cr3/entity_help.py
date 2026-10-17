"""Human-readable help for HA entity hover / more-info (RU + EN)."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

# key → text. Prefer platform:key when the same short key is reused.
HELP_RU: dict[str, str] = {
    # binary
    "online": "Связь платы с брокером MQTT. «Подключено» = LWT online. Если offline — плата выключена, нет сети или MQTT.",
    "alarm": "Есть активная тревога на плате (AFZ, потеря master, датчики и т.п.). Откройте «Alarm text» — там код и текст. По умолчанию тревог нет.",
    "afz": "Сработала антизаморозка (вода и/или воздух): вентилятор на максимум, клапан открыт. Сбрасывается, когда температуры снова в норме.",
    "afz_water": "Сработала AFZ по воде (TIN). Порог задаётся числом «AFZ water» (по умолчанию 8…10 °C в зависимости от прошивки/настроек).",
    "afz_room": "Сработала AFZ по воздуху (AIN), если включён Room AFZ. Порог — «RAFZ air» (по умолчанию 5 °C).",
    "mqtt_wdog": "Сработал MQTT watchdog: долго не было команд cmd/#. Вентилятор удерживается, клапан закрыт (AFZ важнее). Порог — число «MQTT watchdog», по умолчанию 120 с (0 = выкл).",
    # climate / fan / select
    "climate": "Термостат CR3: текущая температура воздуха (Ain), цель Heat target, вкл/выкл контура и % вентилятора. В группе с grp_lock крутите только Master — на Slave поля с замком.",
    "fan": "Вентилятор MIX: процент 0…100. В группе с lock — только с Master.",
    "mode_sel": "Режим платы: slave (копирует % с master), smart (уставки с master, % по своим датчикам), manual (сам по себе), master (ведёт группу). По умолчанию часто manual/slave после настройки.",
    # sensors
    "alarm_text": "Текст/код текущей тревоги или clear. Примеры: sensors not taught, grp_master_lost, antifreeze.",
    "tin": "Температура воды на входе теплообменника (датчик TIN). Нужен TEACH ROM.",
    "tout": "Температура воды на выходе (TOUT).",
    "ain": "Температура воздуха на входе / в помещении (AIN). На CR3 часто используется как «текущая» для Climate.",
    "aout": "Температура воздуха на выходе (AOUT).",
    "dt_water": "ΔT воды = TIN − TOUT. Участвует в расчёте нагрева (INDEX/MAX).",
    "heat_idx": "Индекс нагрева CR3 (безразмерный), по нему крутится вентилятор в режиме INDEX.",
    "heat_process": "Текущее значение процесса нагрева (то, что сравнивается с Heat target).",
    "ttop": "MIX: температура верха (TTOP).",
    "tbot": "MIX: температура низа (TBOT).",
    "dt": "MIX: ΔT = TTOP − TBOT.",
    "phase": "MIX: фаза Idle / Run / Wait.",
    "wait_left": "MIX: секунд до конца паузы Wait.",
    "fan_pct": "Фактический % вентилятора канала 1 (после сглаживания/ограничений).",
    "fan2_pct": "Фактический % второго канала (если включён CH2).",
    "fw": "Версия прошивки платы (например 2.1.95).",
    "ip": "Ethernet IP платы. Откройте http://этот-IP/ в браузере — веб-интерфейс.",
    "uptime": "Секунд с последней перезагрузки платы.",
    "ota": "Статус OTA: idle / started / ok / fail… Во время прошивки может быть JSON с %.",
    "load_pct": "Загрузка главного цикла прошивки (не CPU Linux). Обычно единицы–десятки %.",
    "roms_ok": "1 = нужные ROM датчиков обучены (TEACH), 0 = нет. Без TEACH Smart/Manual уходят в fail-safe.",
    "mode": "Текущий режим строкой: slave / smart / manual / master (то же, что в селекторе Mode).",
    "group": "ID группы вентиляторов (например angar). Пусто = группа выкл / автопоиск на slave.",
    "grp_role": "Фактическая роль в группе: master (ведёт), follow (слушает sync), lost (пропал sync), conflict, none, starting…",
    "grp_master": "device_id текущего Master. На самой mastering-плате — свой id. Пусто = ещё нет sync.",
    "grp_master_ip": "Ethernet IP текущего Master (из sync mip). Откройте http://IP/ — веб Master. На Master — свой IP.",
    "grp_n": "Сколько slave недавно прислали status (видно на Master). На ведомом обычно 0.",
    "grp_lock": "1 = пока жив sync, Slave/Smart не принимают fan/enable из HA (крутите Master). По умолчанию вкл.",
    # numbers (defaults!)
    "heat_target": "Цель контура CR3 (то, к чему стремится heat_process). Меняйте на Master. Типичный старт ~5…20 в зависимости от heat_goal.",
    "setpoint": "Уставка воздуха °C (день/ночь могут отличаться на плате). Диапазон примерно 5…35 °C.",
    "number:afz": "Порог антизаморозки по воде (°C). Ниже TIN → AFZ. По умолчанию около 8 °C (см. веб Безотказность / Упраление).",
    "room_afz": "Порог AFZ по воздуху (°C), если Room AFZ включён. По умолчанию 5 °C.",
    "fan2": "Команда % на второй вентилятор (CH2). 0…100.",
    "fsafe": "Fail-safe % вентилятора при потере датчиков или master_loss=fsafe. По умолчанию 40 %.",
    "dt_on": "MIX: ΔT, с которого начинается разгон. По умолчанию около 3 °C.",
    "dt_full": "MIX: ΔT на полный расход. По умолчанию около 8 °C.",
    "wait_s": "MIX: пауза Wait между циклами, секунды. По умолчанию 300 с.",
    "mqtt_wdog_s": "Секунд тишины MQTT cmd/# до watchdog. По умолчанию 120; 0 = выключен. Не укорачивает таймер LOST master.",
    # switches
    "enable": "Включить/выключить контур (enable). Выкл → 0 % (кроме AFZ). В группе с lock — только с Master.",
    "enable_adv": "То же, что Circuit enable (в Advanced).",
    "valve": "Клапан воды CR3. В slave можно командовать; при AFZ открывается сам. По умолчанию закрыт.",
    "eco": "Eco: CR3 — ночной setpoint; MIX — тихий режим. В slave игнорируется.",
    "room_afz_en": "Разрешить антизаморозку по воздуху (RAFZ). По умолчанию часто вкл.",
}

HELP_EN: dict[str, str] = {
    "online": "Board MQTT connectivity (LWT). Offline = power/network/broker issue.",
    "alarm": "Active alarm on the board. See Alarm text for code. Default: no alarm.",
    "afz": "Antifreeze latched: fan max + valve open until temps recover.",
    "afz_water": "Water AFZ (TIN below threshold). Threshold = AFZ water number.",
    "afz_room": "Room AFZ (AIN) if Room AFZ enabled. Threshold = RAFZ air (default 5 °C).",
    "mqtt_wdog": "MQTT cmd/# silence too long. Default timeout 120 s (0 = off). Does not shorten master LOST timer.",
    "climate": "CR3 thermostat: Ain, Heat target, enable, fan %. In a locked group, control Master only.",
    "fan": "MIX fan 0…100 %. Locked followers are read-only.",
    "mode_sel": "Board mode: slave / smart / manual / master.",
    "alarm_text": "Alarm code/text or clear (e.g. grp_master_lost, sensors not taught).",
    "tin": "Inlet water temperature (TIN). Needs TEACH.",
    "tout": "Outlet water temperature (TOUT).",
    "ain": "Inlet/room air (AIN); often Climate current temp on CR3.",
    "aout": "Outlet air (AOUT).",
    "dt_water": "Water ΔT = TIN − TOUT.",
    "heat_idx": "CR3 heat index driving the fan in INDEX mode.",
    "heat_process": "Process value compared to Heat target.",
    "ttop": "MIX top temperature.",
    "tbot": "MIX bottom temperature.",
    "dt": "MIX ΔT = TTOP − TBOT.",
    "phase": "MIX phase Idle / Run / Wait.",
    "wait_left": "MIX seconds left in Wait.",
    "fan_pct": "Actual fan channel 1 %.",
    "fan2_pct": "Actual fan channel 2 %.",
    "fw": "Firmware version string.",
    "ip": "Board Ethernet IP — open http://IP/ for the web UI.",
    "uptime": "Seconds since reboot.",
    "ota": "OTA status (idle/started/ok/fail or JSON progress).",
    "load_pct": "Main-loop load % (firmware), not host CPU.",
    "roms_ok": "1 = required sensor ROMs taught; 0 = need TEACH.",
    "mode": "Mode string: slave/smart/manual/master.",
    "group": "Fan group id (empty = off / discovery).",
    "grp_role": "Group role: master, follow, lost, conflict, none…",
    "grp_master": "Current master device_id (self when mastering).",
    "grp_master_ip": "Current master Ethernet IP (open http://IP/).",
    "grp_n": "Recent slave count (on master).",
    "grp_lock": "1 = followers ignore HA fan/enable while following (default on).",
    "heat_target": "CR3 heat target — set on Master in a group.",
    "setpoint": "Air setpoint °C (about 5…35).",
    "number:afz": "Water AFZ threshold °C (default ~8 °C).",
    "room_afz": "Room AFZ threshold °C (default 5 °C).",
    "fan2": "Fan2 command %.",
    "fsafe": "Fail-safe fan % (default 40).",
    "dt_on": "MIX ΔT to start ramp (default ~3 °C).",
    "dt_full": "MIX ΔT for full fan (default ~8 °C).",
    "wait_s": "MIX Wait pause seconds (default 300).",
    "mqtt_wdog_s": "MQTT watchdog seconds (default 120, 0 = off).",
    "enable": "Circuit enable. Off → 0 % (except AFZ). Group lock → Master only.",
    "enable_adv": "Same as Circuit enable (Advanced).",
    "valve": "CR3 water valve. AFZ opens it. Default closed.",
    "eco": "Eco mode (night SP / quiet). Ignored on hard slave.",
    "room_afz_en": "Enable room-air AFZ (often on by default).",
}


def _table(hass: HomeAssistant | None) -> dict[str, str]:
    lang = "en"
    if hass is not None:
        lang = (getattr(hass.config, "language", None) or "en").lower()
    return HELP_RU if lang.startswith("ru") else HELP_EN


def help_text(hass: HomeAssistant | None, key: str, platform: str | None = None) -> str:
    """Return help for entity key; try platform:key then key."""
    table = _table(hass)
    if platform:
        # number.afz vs binary afz
        qualified = f"{platform}:{key}"
        if qualified in table:
            return table[qualified]
        # also allow number:afz style already in table
    if key in table:
        return table[key]
    # number platform uses key afz → prefer number:afz
    if platform == "number" and f"number:{key}" in table:
        return table[f"number:{key}"]
    return table.get(key, "")
