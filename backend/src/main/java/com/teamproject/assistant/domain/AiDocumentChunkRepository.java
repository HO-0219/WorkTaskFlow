package com.teamproject.assistant.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiDocumentChunkRepository extends JpaRepository<AiDocumentChunk, Long> {
    // id DESC로 최신 청크부터 유지한다 — 그룹이 MAX_SCANNED_CHUNKS를 넘으면 잘리는 건
    // 뒷부분(오래된 청크)이어야, 최근에 올린 문서가 검색 후보에서 빠지지 않는다.
    List<AiDocumentChunk> findByGroupIdAndResourceDeletedAtIsNullOrderByIdDesc(Long groupId, Pageable pageable);

    @Query("select distinct chunk.resource.id from AiDocumentChunk chunk where chunk.group.id = :groupId")
    List<Long> findIndexedResourceIds(@Param("groupId") Long groupId);

    @Query("select distinct chunk.resource.id from AiDocumentChunk chunk"
            + " where chunk.group.id = :groupId and chunk.embeddingModel = :modelId")
    List<Long> findUpToDateResourceIds(@Param("groupId") Long groupId, @Param("modelId") String modelId);

    boolean existsByResourceId(Long resourceId);

    void deleteByResourceId(Long resourceId);
}
