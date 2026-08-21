CREATE TABLE ai_document_chunks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    chunk_index INT NOT NULL,
    title VARCHAR(120) NOT NULL,
    filename VARCHAR(255) NULL,
    content TEXT NOT NULL,
    embedding LONGBLOB NOT NULL,
    dimensions INT NOT NULL,
    embedding_model VARCHAR(120) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_document_chunks_resource_chunk (resource_id, chunk_index),
    INDEX idx_ai_document_chunks_group (group_id, id),
    CONSTRAINT fk_ai_document_chunks_group FOREIGN KEY (group_id) REFERENCES work_groups (id),
    CONSTRAINT fk_ai_document_chunks_resource FOREIGN KEY (resource_id) REFERENCES group_resources (id)
) ENGINE = InnoDB;
