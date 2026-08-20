package com.teamproject.assistant.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiDocumentChunkRepository extends JpaRepository<AiDocumentChunk, Long> {
    List<AiDocumentChunk> findByGroupIdAndResourceDeletedAtIsNullOrderByIdAsc(Long groupId, Pageable pageable);

    @Query("select distinct chunk.resource.id from AiDocumentChunk chunk where chunk.group.id = :groupId")
    List<Long> findIndexedResourceIds(@Param("groupId") Long groupId);

    @Query("select distinct chunk.resource.id from AiDocumentChunk chunk"
            + " where chunk.group.id = :groupId and chunk.embeddingModel = :modelId")
    List<Long> findUpToDateResourceIds(@Param("groupId") Long groupId, @Param("modelId") String modelId);

    boolean existsByResourceId(Long resourceId);

    void deleteByResourceId(Long resourceId);
}
