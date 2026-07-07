"""
Minimail — 邮箱自动检测

根据邮件域名查找常见的 IMAP/SMTP 服务器配置.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/settings/mail", tags=["settings"])

# 常见邮件服务商配置
KNOWN_PROVIDERS = {
    "gmail.com": {
        "imap": {"host": "imap.gmail.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.gmail.com", "port": 465, "ssl": True},
    },
    "googlemail.com": {
        "imap": {"host": "imap.gmail.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.gmail.com", "port": 465, "ssl": True},
    },
    "outlook.com": {
        "imap": {"host": "outlook.office365.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.office365.com", "port": 587, "ssl": False},
    },
    "hotmail.com": {
        "imap": {"host": "outlook.office365.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.office365.com", "port": 587, "ssl": False},
    },
    "live.com": {
        "imap": {"host": "outlook.office365.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.office365.com", "port": 587, "ssl": False},
    },
    "yahoo.com": {
        "imap": {"host": "imap.mail.yahoo.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.mail.yahoo.com", "port": 465, "ssl": True},
    },
    "icloud.com": {
        "imap": {"host": "imap.mail.me.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.mail.me.com", "port": 587, "ssl": False},
    },
    "qq.com": {
        "imap": {"host": "imap.qq.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.qq.com", "port": 465, "ssl": True},
    },
    "foxmail.com": {
        "imap": {"host": "imap.qq.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.qq.com", "port": 465, "ssl": True},
    },
    "163.com": {
        "imap": {"host": "imap.163.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.163.com", "port": 465, "ssl": True},
    },
    "126.com": {
        "imap": {"host": "imap.126.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.126.com", "port": 465, "ssl": True},
    },
    "yeah.net": {
        "imap": {"host": "imap.yeah.net", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.yeah.net", "port": 465, "ssl": True},
    },
    "sina.com": {
        "imap": {"host": "imap.sina.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.sina.com", "port": 465, "ssl": True},
    },
    "sohu.com": {
        "imap": {"host": "imap.sohu.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.sohu.com", "port": 465, "ssl": True},
    },
    "aliyun.com": {
        "imap": {"host": "imap.aliyun.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.aliyun.com", "port": 465, "ssl": True},
    },
    "yeah.com.cn": {
        "imap": {"host": "imap.yeah.net", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.yeah.net", "port": 465, "ssl": True},
    },
    "zoho.com": {
        "imap": {"host": "imap.zoho.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.zoho.com", "port": 465, "ssl": True},
    },
    "protonmail.com": {
        "imap": {"host": "127.0.0.1", "port": 1143, "ssl": False},
        "smtp": {"host": "127.0.0.1", "port": 1025, "ssl": False},
    },
    "yandex.com": {
        "imap": {"host": "imap.yandex.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.yandex.com", "port": 465, "ssl": True},
    },
    "fastmail.com": {
        "imap": {"host": "imap.fastmail.com", "port": 993, "ssl": True},
        "smtp": {"host": "smtp.fastmail.com", "port": 465, "ssl": True},
    },
}


@router.get("/auto-detect")
async def auto_detect(
    email: str = Query(..., description="邮箱地址"),
    user: User = Depends(get_current_user),
):
    """根据邮箱地址自动检测 IMAP/SMTP 服务器配置."""
    domain = email.split("@")[-1].lower().strip() if "@" in email else ""

    # 精确匹配
    if domain in KNOWN_PROVIDERS:
        config = KNOWN_PROVIDERS[domain]
        return {
            "email": email,
            "domain": domain,
            "provider": domain,
            "imap": config["imap"],
            "smtp": config["smtp"],
            "auto": True,
        }

    # 尝试 MX 记录查询 (如无 DNS 工具则跳过)
    try:
        import dns.resolver
        mx_records = dns.resolver.resolve(domain, "MX", lifetime=5)
        mx_hosts = [str(r.exchange).rstrip(".").lower() for r in mx_records]
        # 尝试反向匹配已知服务商
        for known_domain, config in KNOWN_PROVIDERS.items():
            if any(known_domain in mx for mx in mx_hosts):
                return {
                    "email": email,
                    "domain": domain,
                    "provider": known_domain,
                    "confidence": "mx_match",
                    "imap": config["imap"],
                    "smtp": config["smtp"],
                    "auto": True,
                }
    except ImportError:
        pass  # dnspython 未安装
    except Exception:
        pass  # DNS 查询失败, 忽略

    # 通用猜测
    return {
        "email": email,
        "domain": domain,
        "provider": "unknown",
        "imap": {"host": f"imap.{domain}", "port": 993, "ssl": True},
        "smtp": {"host": f"smtp.{domain}", "port": 465, "ssl": True},
        "auto": False,
    }
