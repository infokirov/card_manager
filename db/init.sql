-- Card Manager: schema, RLS, has_role()

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
);

-- Directories
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE internet_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE software (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE abs_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access cards
CREATE TABLE access_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    has_abs1_access BOOLEAN NOT NULL DEFAULT false,
    has_abs2_access BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_card_resources (
    access_card_id UUID NOT NULL REFERENCES access_cards(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES access_resources(id) ON DELETE CASCADE,
    PRIMARY KEY (access_card_id, resource_id)
);

CREATE TABLE access_card_internet_resources (
    access_card_id UUID NOT NULL REFERENCES access_cards(id) ON DELETE CASCADE,
    internet_resource_id UUID NOT NULL REFERENCES internet_resources(id) ON DELETE CASCADE,
    PRIMARY KEY (access_card_id, internet_resource_id)
);

CREATE TABLE access_card_software (
    access_card_id UUID NOT NULL REFERENCES access_cards(id) ON DELETE CASCADE,
    software_id UUID NOT NULL REFERENCES software(id) ON DELETE CASCADE,
    PRIMARY KEY (access_card_id, software_id)
);

CREATE TABLE access_card_abs (
    access_card_id UUID NOT NULL REFERENCES access_cards(id) ON DELETE CASCADE,
    abs_access_id UUID NOT NULL REFERENCES abs_access(id) ON DELETE CASCADE,
    PRIMARY KEY (access_card_id, abs_access_id)
);

CREATE TABLE access_card_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_card_id UUID NOT NULL REFERENCES access_cards(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications
CREATE TABLE notification_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT false,
    smtp_host TEXT DEFAULT '',
    smtp_port INT DEFAULT 587,
    smtp_login TEXT DEFAULT '',
    smtp_password TEXT DEFAULT '',
    sender_email TEXT DEFAULT '',
    sender_name TEXT DEFAULT '',
    use_tls BOOLEAN NOT NULL DEFAULT true,
    recipients TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO notification_settings (id) VALUES (1);

-- Role check (SECURITY DEFINER, no RLS recursion)
CREATE OR REPLACE FUNCTION has_role(check_user_id UUID, check_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = check_user_id AND role = check_role
    );
$$;

-- Session helpers for RLS
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT current_user_id() IS NOT NULL;
$$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE internet_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE abs_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_card_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_card_internet_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_card_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_card_abs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_card_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Directories: anonymous read
CREATE POLICY departments_select ON departments FOR SELECT USING (true);
CREATE POLICY positions_select ON positions FOR SELECT USING (true);
CREATE POLICY access_resources_select ON access_resources FOR SELECT USING (true);
CREATE POLICY internet_resources_select ON internet_resources FOR SELECT USING (true);
CREATE POLICY software_select ON software FOR SELECT USING (true);
CREATE POLICY abs_access_select ON abs_access FOR SELECT USING (true);

CREATE POLICY departments_admin ON departments FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY positions_admin ON positions FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY access_resources_admin ON access_resources FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY internet_resources_admin ON internet_resources FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY software_admin ON software FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY abs_access_admin ON abs_access FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

-- Employees
CREATE POLICY employees_select ON employees FOR SELECT
    USING (is_authenticated());
CREATE POLICY employees_admin ON employees FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

-- Access cards
CREATE POLICY access_cards_select ON access_cards FOR SELECT USING (is_authenticated());
CREATE POLICY access_cards_admin ON access_cards FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY acr_select ON access_card_resources FOR SELECT USING (is_authenticated());
CREATE POLICY acr_admin ON access_card_resources FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY acir_select ON access_card_internet_resources FOR SELECT USING (is_authenticated());
CREATE POLICY acir_admin ON access_card_internet_resources FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY acs_select ON access_card_software FOR SELECT USING (is_authenticated());
CREATE POLICY acs_admin ON access_card_software FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY aca_select ON access_card_abs FOR SELECT USING (is_authenticated());
CREATE POLICY aca_admin ON access_card_abs FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

CREATE POLICY ach_select ON access_card_history FOR SELECT USING (is_authenticated());
CREATE POLICY ach_insert ON access_card_history FOR INSERT
    WITH CHECK (has_role(current_user_id(), 'admin') OR true);

-- Users / profiles / roles
CREATE POLICY users_select_own ON users FOR SELECT
    USING (id = current_user_id() OR has_role(current_user_id(), 'admin'));
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (user_id = current_user_id() OR has_role(current_user_id(), 'admin'));
CREATE POLICY user_roles_select ON user_roles FOR SELECT
    USING (user_id = current_user_id() OR has_role(current_user_id(), 'admin'));

-- Notifications: admin only
CREATE POLICY notification_admin ON notification_settings FOR ALL
    USING (has_role(current_user_id(), 'admin'))
    WITH CHECK (has_role(current_user_id(), 'admin'));

-- App role for connections (bypasses RLS when needed via service)
CREATE ROLE card_app LOGIN PASSWORD 'card_app_secret';
GRANT USAGE ON SCHEMA public TO card_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO card_app;
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO card_app;

CREATE ROLE card_service LOGIN PASSWORD 'card_service_secret' BYPASSRLS;
GRANT ALL ON SCHEMA public TO card_service;

-- Seed directories
INSERT INTO departments (name) VALUES
    ('ИТ-отдел'), ('Бухгалтерия'), ('Отдел кадров'), ('Юридический отдел'), ('Маркетинг');

INSERT INTO positions (name) VALUES
    ('Системный администратор'), ('Бухгалтер'), ('Менеджер'), ('Юрист'), ('Разработчик');

INSERT INTO access_resources (name, description) VALUES
    ('Файловый сервер', 'Доступ к сетевым папкам'),
    ('Принтер', 'Сетевой принтер'),
    ('VPN', 'Удалённый доступ');

INSERT INTO internet_resources (name, url, description) VALUES
    ('Корпоративный портал', 'https://portal.company.ru', 'Внутренний портал'),
    ('Почта', 'https://mail.company.ru', 'Web-почта');

INSERT INTO software (name, version, description) VALUES
    ('Microsoft Office', '2021', 'Пакет офисных приложений'),
    ('1С:Предприятие', '8.3', 'Бухгалтерская система');

INSERT INTO abs_access (name) VALUES
    ('Чтение'), ('Запись'), ('Полный доступ');

-- Default users (passwords set on backend startup)
INSERT INTO users (email, password_hash, email_confirmed) VALUES
    ('admin@company.ru', '$2b$12$placeholder', true),
    ('zenitars@gmail.com', '$2b$12$placeholder', true);

INSERT INTO profiles (user_id, display_name)
SELECT id, 'Администратор' FROM users WHERE email = 'admin@company.ru';

INSERT INTO profiles (user_id, display_name)
SELECT id, 'Сидоров' FROM users WHERE email = 'zenitars@gmail.com';

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM users WHERE email IN ('admin@company.ru', 'zenitars@gmail.com');

-- Sample employees
INSERT INTO employees (full_name, department_id, position_id, is_dismissed)
SELECT 'Иванов Иван Иванович', d.id, p.id, false
FROM departments d, positions p WHERE d.name = 'ИТ-отдел' AND p.name = 'Системный администратор';

INSERT INTO employees (full_name, department_id, position_id, is_dismissed)
SELECT 'Петрова Анна Сергеевна', d.id, p.id, false
FROM departments d, positions p WHERE d.name = 'Бухгалтерия' AND p.name = 'Бухгалтер';

INSERT INTO access_cards (employee_id, has_abs1_access, has_abs2_access)
SELECT e.id, true, false FROM employees e WHERE e.full_name = 'Иванов Иван Иванович';

INSERT INTO access_cards (employee_id, has_abs1_access, has_abs2_access)
SELECT e.id, true, true FROM employees e WHERE e.full_name = 'Петрова Анна Сергеевна';
