-- Run on existing databases (volume already initialized):
-- docker compose exec db psql -U postgres -d card_manager -f /docker-entrypoint-initdb.d/grant-service.sql
-- Or: docker compose exec db psql -U postgres -d card_manager -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO card_service; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO card_service; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO card_service;"

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO card_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO card_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO card_service;
