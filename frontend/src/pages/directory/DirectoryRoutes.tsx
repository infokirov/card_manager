import { DirectoryPage } from "@/components/DirectoryPage";

export function DepartmentsPage() {
  return <DirectoryPage title="Отделы" slug="departments" />;
}

export function PositionsPage() {
  return <DirectoryPage title="Должности" slug="positions" />;
}

export function AccessResourcesPage() {
  return (
    <DirectoryPage
      title="Ресурсы доступа"
      slug="access-resources"
      extraFields={[{ key: "description", label: "Описание" }]}
    />
  );
}

export function InternetResourcesPage() {
  return (
    <DirectoryPage
      title="Интернет-ресурсы"
      slug="internet-resources"
      extraFields={[
        { key: "url", label: "URL" },
        { key: "description", label: "Описание" },
      ]}
    />
  );
}

export function SoftwarePage() {
  return (
    <DirectoryPage
      title="Программное обеспечение"
      slug="software"
      extraFields={[
        { key: "version", label: "Версия" },
        { key: "description", label: "Описание" },
      ]}
    />
  );
}

export function AbsAccessPage() {
  return <DirectoryPage title="Доступ к АБС" slug="abs-access" />;
}
