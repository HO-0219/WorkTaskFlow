ALTER TABLE ai_document_chunks
    DROP FOREIGN KEY fk_ai_document_chunks_resource,
    DROP INDEX uk_ai_document_chunks_resource_chunk,
    CHANGE COLUMN resource_id group_resource_id BIGINT NULL,
    ADD COLUMN project_document_id BIGINT NULL AFTER group_resource_id;

ALTER TABLE ai_document_chunks
    ADD CONSTRAINT fk_ai_document_chunks_group_resource
        FOREIGN KEY (group_resource_id) REFERENCES group_resources (id),
    ADD CONSTRAINT fk_ai_document_chunks_project_document
        FOREIGN KEY (project_document_id) REFERENCES project_documents (id),
    ADD UNIQUE KEY uk_ai_document_chunks_group_resource_chunk (group_resource_id, chunk_index),
    ADD UNIQUE KEY uk_ai_document_chunks_project_document_chunk (project_document_id, chunk_index),
    ADD CONSTRAINT ck_ai_document_chunks_single_source
        CHECK ((group_resource_id IS NULL) <> (project_document_id IS NULL));
