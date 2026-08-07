package com.teamproject.assistant.application;

import com.teamproject.assistant.domain.AiDocumentChunk;
import com.teamproject.assistant.domain.AiDocumentChunkRepository;
import com.teamproject.resource.domain.GroupResource;
import com.teamproject.resource.domain.GroupResourceRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 색인의 DB 접근만 모아 둔 곳.
 *
 * <p>{@link AiDocumentIndexService} 가 임베딩 호출을 트랜잭션 밖에서 하려면 읽기와 쓰기가
 * 각각 짧은 트랜잭션이어야 한다. 같은 빈 안에서 @Transactional 메서드를 부르면 프록시를 타지
 * 않으므로 별도 빈으로 나눈다.
 */
@Service
public class AiDocumentChunkStore {
    private final AiDocumentChunkRepository chunks;
    private final GroupResourceRepository resources;

    public AiDocumentChunkStore(AiDocumentChunkRepository chunks, GroupResourceRepository resources) {
        this.chunks = chunks;
        this.resources = resources;
    }

    @Transactional(readOnly = true)
    public List<Candidate> candidates(Long groupId) {
        return resources.findAllByGroupIdAndTaskIsNullAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(groupId)
                .stream()
                .map(resource -> new Candidate(resource.getId(), resource.getTitle(),
                        resource.getOriginalFilename(), resource.getStorageKey()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<Long> indexedResourceIds(Long groupId) {
        return Set.copyOf(chunks.findIndexedResourceIds(groupId));
    }

    @Transactional
    public void deleteResource(Long resourceId) {
        chunks.deleteByResourceId(resourceId);
    }

    @Transactional
    public void save(Long groupId, Candidate candidate, List<String> pieces, List<float[]> vectors) {
        GroupResource resource = resources.findByIdAndDeletedAtIsNull(candidate.resourceId()).orElse(null);
        // 색인 도중 자료가 지워졌을 수 있다. 그러면 저장할 근거가 없으므로 조용히 건너뛴다.
        if (resource == null || !resource.getGroup().getId().equals(groupId)) return;
        List<AiDocumentChunk> rows = new ArrayList<>(pieces.size());
        for (int index = 0; index < pieces.size(); index++) {
            rows.add(new AiDocumentChunk(resource.getGroup(), resource, index, candidate.title(),
                    candidate.filename(), pieces.get(index), vectors.get(index)));
        }
        chunks.saveAll(rows);
    }

    public record Candidate(Long resourceId, String title, String filename, String storageKey) {}
}
