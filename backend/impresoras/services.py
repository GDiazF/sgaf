from dataclasses import dataclass, field
from typing import Dict, List, Optional
from django.utils import timezone
import subprocess

try:
    from pysnmp.hlapi.asyncio import (
        CommunityData,
        ContextData,
        ObjectIdentity,
        ObjectType,
        SnmpEngine,
        UdpTransportTarget,
        get_cmd,
        walk_cmd,
    )
    from pysnmp.proto.rfc1902 import OctetString as SnmpOctetString
except Exception:
    CommunityData = None
    SnmpOctetString = None

from .models import Printer

class PollingError(Exception):
    """Raised when we cannot obtain SNMP status from a printer."""

@dataclass
class PollResult:
    black: Optional[float] = None
    cyan: Optional[float] = None
    magenta: Optional[float] = None
    yellow: Optional[float] = None
    serial_number: Optional[str] = None
    connected: Optional[bool] = None
    woke: Optional[bool] = None
    errors: List[str] = field(default_factory=list)
    ok: bool = True
    message: str = ""

    def to_levels(self) -> Dict[str, Optional[float]]:
        return {
            "black": self.black,
            "cyan": self.cyan,
            "magenta": self.magenta,
            "yellow": self.yellow,
        }

ERROR_BITS = {
    0: "Poco papel",
    1: "Sin papel",
    2: "Atasco de papel",
    3: "Offline",
    4: "Requiere servicio",
    5: "Bandeja de entrada ausente",
    6: "Bandeja de salida ausente",
    7: "Toner bajo",
    8: "Toner agotado",
    9: "Bandeja de salida casi llena",
}

def _decode_error_state(raw_value) -> List[str]:
    try:
        if hasattr(raw_value, "asOctets"):
            raw_bytes = bytes(raw_value.asOctets())
            value = int.from_bytes(raw_bytes, byteorder="big")
        elif SnmpOctetString is not None and isinstance(raw_value, SnmpOctetString):
            value = int.from_bytes(bytes(raw_value), byteorder="big")
        elif isinstance(raw_value, (bytes, bytearray)):
            value = int.from_bytes(raw_value, byteorder="big")
        else:
            value = int(raw_value)
    except Exception:
        return []
    messages = []
    for bit, label in ERROR_BITS.items():
        if value & (1 << bit):
            messages.append(label)
    return messages

def _guess_color(description: str) -> Optional[str]:
    desc = (description or "").lower()
    if "black" in desc or "negro" in desc or "bk" in desc:
        return "black"
    if "cyan" in desc:
        return "cyan"
    if "magenta" in desc:
        return "magenta"
    if "yellow" in desc or "amar" in desc:
        return "yellow"
    return None

def _safe_percent(level: Optional[int], maximum: Optional[int]) -> Optional[float]:
    if level is None or maximum in (None, 0):
        return None
    try:
        if int(level) < 0 or int(maximum) <= 0:
            return None
        return round(min(max((int(level) / int(maximum)) * 100, 0), 100), 1)
    except Exception:
        return None

def poll_printer(printer: Printer) -> PollResult:
    if CommunityData is None:
        raise PollingError("pysnmp not installed or import failed.")

    host = printer.ip_address
    port = printer.snmp_port or 161
    community_candidates = []
    if printer.community:
        community_candidates.append(printer.community)
    if "public" not in community_candidates:
        community_candidates.append("public")

    async def wake_printer(engine, community, target, context) -> bool:
        try:
            res = await get_cmd(
                engine,
                community,
                target,
                context,
                ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")),
            )
            if res:
                err_ind, err_status, _, _ = res
                return not err_ind and not err_status
        except Exception:
            return False
        return False

    async def walk_values(engine, community, target, context, oid: str) -> Dict[int, int]:
        results: Dict[int, int] = {}
        async for (error_indication, error_status, error_index, var_binds) in walk_cmd(
            engine,
            community,
            target,
            context,
            ObjectType(ObjectIdentity(oid)),
            lexicographicMode=False,
        ):
            if error_indication:
                raise PollingError(str(error_indication))
            if error_status:
                raise PollingError(error_status.prettyPrint())
            try:
                current_oid = var_binds[0][0].prettyPrint()
                index = int(current_oid.split(".")[-1])
                value = int(var_binds[0][1])
            except Exception:
                continue
            results[index] = value
        return results

    async def _async_poll(community_str: str, mp_model: int) -> PollResult:
        engine = SnmpEngine()
        community = CommunityData(community_str, mpModel=mp_model)
        target = await UdpTransportTarget.create(
            (host, port),
            timeout=3,
            retries=1,
        )
        context = ContextData()

        async def read_once() -> Dict[str, any]:
            timeout = 1 if mp_model == 1 else 0.5 # Faster for scan
            target_with_timeout = await UdpTransportTarget.create(
                (host, port),
                timeout=timeout,
                retries=0,
            )
            desc_map = await walk_values(engine, community, target_with_timeout, context, "1.3.6.1.2.1.43.11.1.1.6.1")
            level_map = await walk_values(engine, community, target_with_timeout, context, "1.3.6.1.2.1.43.11.1.1.9.1")
            max_map = await walk_values(engine, community, target, context, "1.3.6.1.2.1.43.11.1.1.8.1")
            supplies = []
            for index in sorted(level_map.keys()):
                supplies.append(
                    {
                        "index": index,
                        "description": desc_map.get(index, ""),
                        "level": level_map.get(index),
                        "maximum": max_map.get(index),
                    }
                )
            return {"supplies": supplies, "desc_map": desc_map, "level_map": level_map, "max_map": max_map}

        supplies = []
        desc_map = {}
        level_map = {}
        max_map = {}
        serial_number = None
        wake_result = await wake_printer(engine, community, target, context)
        try:
            serial_res = await get_cmd(
                engine,
                community,
                target,
                context,
                ObjectType(ObjectIdentity("1.3.6.1.2.1.43.5.1.1.17.1")),
            )
            if serial_res:
                err_ind, err_status, _, vb = serial_res
                if not err_ind and not err_status:
                    serial_number = str(vb[0][1]).strip()
        except Exception:
            pass
        data = await read_once()
        supplies = data["supplies"]
        desc_map = data["desc_map"]
        level_map = data["level_map"]
        max_map = data["max_map"]
        connected = wake_result or bool(supplies)

        errors: List[str] = []
        try:
            result = await get_cmd(
                engine,
                community,
                target,
                context,
                ObjectType(ObjectIdentity("1.3.6.1.2.1.25.3.5.1.2.1")),
            )
            if result:
                error_indication, error_status, _, var_binds = result
                if not error_indication and not error_status:
                    decoded_errors = _decode_error_state(var_binds[0][1])
                    errors.extend(decoded_errors)
        except Exception:
            pass

        color_levels: Dict[str, Optional[float]] = {
            "black": None,
            "cyan": None,
            "magenta": None,
            "yellow": None,
        }

        index_color_map = {
            1: "black",
            2: "cyan",
            3: "magenta",
            4: "yellow",
        }

        for supply in supplies:
            color = _guess_color(supply["description"])
            if not color and printer.type == Printer.TYPE_COLOR:
                color = index_color_map.get(supply["index"])
            if not color:
                continue
            percent = _safe_percent(supply["level"], supply["maximum"])
            if color_levels[color] is None:
                color_levels[color] = percent

        if printer.type == Printer.TYPE_BW and supplies and color_levels["black"] is None:
            first_supply = supplies[0]
            color_levels["black"] = _safe_percent(first_supply["level"], first_supply["maximum"])

        messages = []
        is_ok = not errors and bool(supplies)
        if errors:
            messages.append(", ".join(errors))
        if not supplies:
            messages.append("No se encontraron datos de consumibles.")

        return PollResult(
            black=color_levels["black"],
            cyan=color_levels["cyan"],
            magenta=color_levels["magenta"],
            yellow=color_levels["yellow"],
            errors=errors,
            ok=is_ok,
            message="; ".join(messages) if messages else "OK",
            serial_number=serial_number,
            connected=connected,
            woke=wake_result,
        )

    last_error: Optional[Exception] = None
    for community_str in community_candidates:
        for mp_model in (1, 0):  # v2c first, then fallback to v1
            try:
                import asyncio
                return asyncio.run(_async_poll(community_str, mp_model))
            except Exception as exc:
                last_error = exc
                continue
    
    # Fallback to snmpwalk CLI
    for community_str in community_candidates:
        cli_result = _poll_with_snmpwalk(host, port, community_str)
        if cli_result:
            return cli_result
    if last_error:
        raise PollingError(str(last_error)) from last_error
    raise PollingError("Could not obtain SNMP data.")

def _poll_with_snmpwalk(host: str, port: int, community: str) -> Optional[PollResult]:
    def run_walk(oid: str) -> Dict[int, str]:
        try:
            result = subprocess.run(
                ["snmpwalk", "-v1", "-c", community, f"{host}:{port}", oid],
                check=False,
                capture_output=True,
                text=True,
                timeout=10,
            )
        except FileNotFoundError:
            return {}
        except subprocess.TimeoutExpired:
            return {}
        if result.returncode not in (0, 1):
            return {}
        lines = result.stdout.splitlines()
        values: Dict[int, str] = {}
        for line in lines:
            if "=" not in line:
                continue
            try:
                left, right = line.split("=", 1)
                oid_part = left.strip().split()[-1]
                idx = int(oid_part.split(".")[-1])
                value = right.split(":", 1)[-1].strip()
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                values[idx] = value
            except Exception:
                continue
        return values

    desc_map = run_walk("1.3.6.1.2.1.43.11.1.1.6.1")
    level_map_raw = run_walk("1.3.6.1.2.1.43.11.1.1.9.1")
    max_map_raw = run_walk("1.3.6.1.2.1.43.11.1.1.8.1")
    serial_map = run_walk("1.3.6.1.2.1.43.5.1.1.17.1")
    if not desc_map and not level_map_raw and not max_map_raw:
        return None

    level_map = {}
    max_map = {}
    for k, v in level_map_raw.items():
        try:
            level_map[k] = int(v)
        except Exception:
            continue
    for k, v in max_map_raw.items():
        try:
            max_map[k] = int(v)
        except Exception:
            continue

    supplies = []
    for index, level in level_map.items():
        supplies.append(
            {
                "index": index,
                "description": desc_map.get(index, ""),
                "level": level,
                "maximum": max_map.get(index),
            }
        )

    color_levels: Dict[str, Optional[float]] = {
        "black": None,
        "cyan": None,
        "magenta": None,
        "yellow": None,
    }
    for supply in supplies:
        color = _guess_color(supply["description"])
        if not color:
            continue
        percent = _safe_percent(supply["level"], supply["maximum"])
        if color_levels[color] is None:
            color_levels[color] = percent

    if supplies and color_levels["black"] is None:
        first_supply = supplies[0]
        color_levels["black"] = _safe_percent(first_supply["level"], first_supply["maximum"])

    return PollResult(
        black=color_levels["black"],
        cyan=color_levels["cyan"],
        magenta=color_levels["magenta"],
        yellow=color_levels["yellow"],
        serial_number=next(iter(serial_map.values()), None),
        connected=bool(supplies),
        woke=bool(supplies),
        errors=[],
        ok=bool(supplies),
        message="OK (snmpwalk fallback)" if supplies else "No supplies found via snmpwalk.",
    )

def poll_and_store_printer(printer: Printer) -> PollResult:
    result = poll_printer(printer)
    printer.last_check = timezone.now()
    printer.last_ok = result.ok
    printer.last_message = result.message
    printer.last_black = result.black
    printer.last_cyan = result.cyan
    printer.last_magenta = result.magenta
    printer.last_yellow = result.yellow
    printer.last_errors = result.errors
    if result.serial_number:
        printer.serial_number = result.serial_number
    printer.last_connected = result.connected
    printer.last_woke = result.woke
    printer.save(
        update_fields=[
            "last_check",
            "last_ok",
            "last_message",
            "last_black",
            "last_cyan",
            "last_magenta",
            "last_yellow",
            "last_errors",
            "serial_number",
            "last_connected",
            "last_woke",
        ]
    )
    return result

async def probe_ip(ip: str, community: str = "public") -> Optional[Dict[str, str]]:
    """Probes a single IP for SNMP printer info."""
    if CommunityData is None:
        return None
    
    engine = SnmpEngine()
    comm_data = CommunityData(community, mpModel=1) # v2c
    try:
        target = await UdpTransportTarget.create((ip, 161), timeout=0.5, retries=0)
        # Try to get sysDescr and Printer Name
        res = await get_cmd(
            engine,
            comm_data,
            target,
            ContextData(),
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")), # sysDescr
            ObjectType(ObjectIdentity("1.3.6.1.2.1.43.5.1.1.16.1")), # prtGeneralPrinterName
        )
        if res:
            err_ind, err_status, _, vb = res
            if not err_ind and not err_status:
                descr = str(vb[0][1])
                name = str(vb[1][1]) if len(vb) > 1 else "Unknown Printer"
                # If name is "0" or empty, use descr snippet
                if name in ("0", ""):
                    name = descr[:30] + "..." if len(descr) > 30 else descr
                
                # Check if it looks like a printer
                is_printer = any(x in descr.lower() for x in ["printer", "laserjet", "designjet", "epson", "canon", "brother", "ricoh", "lexmark", "xerox", "konica", "kyocera", "sharp"])
                if is_printer:
                    return {
                        "ip": ip,
                        "name": name.strip(),
                        "description": descr.strip(),
                    }
    except Exception:
        pass
    return None

import ipaddress

def scan_network_range(start_ip: str, end_ip: str, community: str = "public") -> List[Dict[str, str]]:
    """Scans a range of IPs for SNMP printers."""
    try:
        start = ipaddress.IPv4Address(start_ip)
        end = ipaddress.IPv4Address(end_ip)
    except ValueError:
        return []

    found = []
    
    async def run_scan():
        tasks = []
        # Limit to 255 IPs to avoid overflow/long wait
        count = 0
        current = start
        while current <= end and count < 256:
            tasks.append(probe_ip(str(current), community))
            current += 1
            count += 1
        
        import asyncio
        results = await asyncio.gather(*tasks)
        return [r for r in results if r]

    import asyncio
    try:
        return asyncio.run(run_scan())
    except Exception:
        return []
