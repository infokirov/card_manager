interface PrintData {
  employeeName: string;
  department: string;
  position: string;
  hasAbs1: boolean;
  hasAbs2: boolean;
  resources: { name: string }[];
  internet: { name: string; url?: string }[];
  software: { name: string; version?: string }[];
  absAccess: { name: string }[];
}

export function printAccessCard(data: PrintData) {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Карточка доступа — ${data.employeeName}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; padding: 2rem; color: #0f172a; }
    h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
    h2 { font-size: 1rem; margin-top: 1.5rem; color: #475569; }
    ul { line-height: 1.8; }
    .meta { margin: 1rem 0; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 0.5rem; font-size: 0.85rem; }
    .yes { background: #dcfce7; color: #166534; }
    .no { background: #f1f5f9; color: #64748b; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>Карточка доступа сотрудника</h1>
  <div class="meta">
    <p><strong>ФИО:</strong> ${data.employeeName}</p>
    <p><strong>Отдел:</strong> ${data.department || "—"}</p>
    <p><strong>Должность:</strong> ${data.position || "—"}</p>
    <p><strong>АБС1:</strong> <span class="badge ${data.hasAbs1 ? "yes" : "no"}">${data.hasAbs1 ? "Да" : "Нет"}</span></p>
    <p><strong>АБС2:</strong> <span class="badge ${data.hasAbs2 ? "yes" : "no"}">${data.hasAbs2 ? "Да" : "Нет"}</span></p>
  </div>
  <h2>Доступ к АБС</h2>
  <ul>${data.absAccess.map((a) => `<li>${a.name}</li>`).join("") || "<li>—</li>"}</ul>
  <h2>Локальные ресурсы</h2>
  <ul>${data.resources.map((r) => `<li>${r.name}</li>`).join("") || "<li>—</li>"}</ul>
  <h2>Интернет-ресурсы</h2>
  <ul>${data.internet.map((r) => `<li>${r.name}${r.url ? ` (${r.url})` : ""}</li>`).join("") || "<li>—</li>"}</ul>
  <h2>Программное обеспечение</h2>
  <ul>${data.software.map((s) => `<li>${s.name}${s.version ? ` v${s.version}` : ""}</li>`).join("") || "<li>—</li>"}</ul>
  <p style="margin-top:2rem;font-size:0.8rem;color:#94a3b8">Дата печати: ${new Date().toLocaleString("ru-RU")}</p>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
}
