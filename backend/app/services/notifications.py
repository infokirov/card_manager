import aiosmtplib
from email.message import EmailMessage


async def send_test_email(settings: dict, to_email: str) -> None:
    if not settings.get("smtp_host"):
        raise ValueError("SMTP не настроен")
    msg = EmailMessage()
    msg["From"] = f"{settings['sender_name']} <{settings['sender_email']}>"
    msg["To"] = to_email
    msg["Subject"] = "Тестовое уведомление — Система управления доступом"
    msg.set_content("Это тестовое письмо от системы управления карточками доступа.")

    await aiosmtplib.send(
        msg,
        hostname=settings["smtp_host"],
        port=settings["smtp_port"],
        username=settings["smtp_login"] or None,
        password=settings["smtp_password"] or None,
        start_tls=settings.get("use_tls", True),
    )


async def send_access_card_notification(conn, employee_name: str) -> None:
    settings = await conn.fetchrow("SELECT * FROM notification_settings WHERE id = 1")
    if not settings or not settings["enabled"] or not settings["recipients"]:
        return
    if not settings["smtp_host"]:
        return

    msg = EmailMessage()
    msg["From"] = f"{settings['sender_name']} <{settings['sender_email']}>"
    msg["Subject"] = f"Новая карточка доступа: {employee_name}"
    msg.set_content(
        f"Создана или обновлена карточка доступа для сотрудника: {employee_name}."
    )

    for recipient in settings["recipients"]:
        msg["To"] = recipient
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings["smtp_host"],
                port=settings["smtp_port"],
                username=settings["smtp_login"] or None,
                password=settings["smtp_password"] or None,
                start_tls=settings.get("use_tls", True),
            )
        except Exception:
            pass  # don't fail main transaction on email errors
