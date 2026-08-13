package com.teamproject.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class MySqlFlywayMigrationTest {
    @Container
    static final MySQLContainer<?> MYSQL =
            new MySQLContainer<>("mysql:8.4")
                    .withDatabaseName("worktaskflow_migration")
                    .withUsername("worktaskflow")
                    .withPassword("worktaskflow");

    @Test
    void migratesFreshMySqlSchemaFromV1ThroughV43() throws Exception {
        Flyway flyway = Flyway.configure()
                .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration")
                .load();

        flyway.migrate();

        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("43");
        assertThat(countSchemaObjects(
                "information_schema.tables",
                "table_name",
                List.of(
                        "reports",
                        "ai_weekly_report_revision",
                        "task_activity_events",
                        "weekly_objectives",
                        "task_weekly_objective_links",
                        "ai_assistant_actions",
                        "ai_assistant_messages",
                        "projects",
                        "project_issue_nodes",
                        "project_issue_checklist_items",
                        "project_issue_images",
                        "project_documents",
                        "chat_channels",
                        "chat_messages",
                        "chat_socket_tickets")))
                .isEqualTo(15);
        assertThat(countColumns(
                "reports",
                List.of(
                        "ai_context_json",
                        "reference_index_json",
                        "evidence_json",
                        "editorial_json",
                        "publication_status",
                        "editor_version")))
                .isEqualTo(6);
        assertThat(countColumns(
                "tasks",
                List.of(
                        "blocker_type",
                        "blocker_next_action_type",
                        "blocker_review_date")))
                .isEqualTo(3);
        assertThat(countColumns(
                "payment_attempts",
                List.of(
                        "subscription_id",
                        "business_key",
                        "billing_period_start",
                        "billing_kind",
                        "provider_payment_key")))
                .isEqualTo(5);
        assertThat(countColumns(
                "group_subscriptions",
                List.of("billing_claim_key", "billing_claimed_at")))
                .isEqualTo(2);
        assertThat(countColumns(
                "projects",
                List.of(
                        "group_id",
                        "lead_member_id",
                        "created_by_member_id",
                        "status",
                        "start_date",
                        "due_date",
                        "version")))
                .isEqualTo(7);
        assertThat(countColumns(
                "project_issue_nodes",
                List.of("project_id", "parent_id", "assignee_member_id", "level", "status", "archived_at", "version")))
                .isEqualTo(7);
        assertThat(countColumns(
                "project_documents",
                List.of("project_id", "issue_node_id", "document_type", "storage_key", "size_bytes", "deleted_at")))
                .isEqualTo(6);
        assertThat(countColumns(
                "chat_messages",
                List.of("channel_id", "sender_member_id", "message_type", "storage_key", "size_bytes", "created_at")))
                .isEqualTo(6);
    }

    private long countColumns(String table, List<String> columns) throws Exception {
        String placeholders = String.join(",", columns.stream().map(ignored -> "?").toList());
        String sql = """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name IN (%s)
                """.formatted(placeholders);
        try (Connection connection = MYSQL.createConnection("");
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            for (int index = 0; index < columns.size(); index++) {
                statement.setString(index + 2, columns.get(index));
            }
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getLong(1);
            }
        }
    }

    private long countSchemaObjects(
            String informationSchemaTable, String nameColumn, List<String> names)
            throws Exception {
        String placeholders = String.join(",", names.stream().map(ignored -> "?").toList());
        String sql = """
                SELECT COUNT(*)
                FROM %s
                WHERE table_schema = DATABASE()
                  AND %s IN (%s)
                """.formatted(informationSchemaTable, nameColumn, placeholders);
        try (Connection connection = MYSQL.createConnection("");
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < names.size(); index++) {
                statement.setString(index + 1, names.get(index));
            }
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getLong(1);
            }
        }
    }
}
