package com.teamproject.assistant.application;

import com.teamproject.assistant.application.AiDocumentChunkStore.Candidate;
import com.teamproject.assistant.application.dto.AiAssistantDtos.IndexResponse;
import com.teamproject.assistant.application.port.EmbeddingGateway;
import com.teamproject.group.application.GroupAuthorization;
import com.teamproject.resource.storage.FileStorage;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 그룹 자료 증분 색인.
 *
 * <p>자료는 한 번 올리면 내용이 바뀌지 않는다(수정 API 가 없다). 그래서 자료 ID 만으로 색인
 * 여부를 판단한다. 목록에서 사라진 자료는 삭제된 것이므로 색인에서도 지운다. 같은 그룹에 몇 번을
 * 돌려도 결과가 같다.
 *
 * <p>임베딩 호출은 트랜잭션 밖에서 한다. 메타데이터를 짧은 트랜잭션으로 읽고, 파일 읽기와 외부
 * 호출을 마친 뒤, 저장만 다시 짧은 트랜잭션으로 처리한다({@link AiDocumentChunkStore}).
 */
@Service
public class AiDocumentIndexService {
    private static final Logger log = LoggerFactory.getLogger(AiDocumentIndexService.class);

    private final GroupAuthorization authorization;
    private final AiDocumentChunkStore store;
    private final FileStorage storage;
    private final DocumentTextExtractor extractor;
    private final TextChunker chunker;
    private final EmbeddingGateway embeddings;

    public AiDocumentIndexService(GroupAuthorization authorization, AiDocumentChunkStore store,
            FileStorage storage, DocumentTextExtractor extractor, TextChunker chunker,
            EmbeddingGateway embeddings) {
        this.authorization = authorization;
        this.store = store;
        this.storage = storage;
        this.extractor = extractor;
        this.chunker = chunker;
        this.embeddings = embeddings;
    }

    public IndexResponse reindex(Long userId, Long groupId) {
        authorization.requireActiveMember(groupId, userId);
        List<Candidate> candidates = store.candidates(groupId);
        Set<Long> indexed = store.indexedResourceIds(groupId);
        Set<Long> live = new HashSet<>();
        candidates.forEach(candidate -> live.add(candidate.resourceId()));

        int added = 0;
        int skipped = 0;
        int removed = 0;
        int unsupported = 0;
        List<String> failures = new ArrayList<>();

        for (Long stale : indexed) {
            if (!live.contains(stale)) {
                store.deleteResource(stale);
                removed++;
            }
        }
        for (Candidate candidate : candidates) {
            if (indexed.contains(candidate.resourceId())) {
                skipped++;
                continue;
            }
            if (candidate.storageKey() == null) {
                // 외부 링크는 본문을 가져오지 않는다. 제목만으로는 색인 가치가 없다.
                skipped++;
                continue;
            }
            if (!extractor.supports(candidate.filename())) {
                unsupported++;
                continue;
            }
            List<String> pieces;
            try {
                byte[] content = storage.get(candidate.storageKey()).content();
                pieces = chunker.split(extractor.extract(content, candidate.filename()));
            } catch (RuntimeException exception) {
                // 자료 하나가 실패해도 나머지는 계속 색인한다. 본문은 로그에 남기지 않는다.
                log.warn("자료 {} 본문 추출 실패: {}", candidate.resourceId(),
                        exception.getClass().getSimpleName());
                failures.add(candidate.title());
                continue;
            }
            if (pieces.isEmpty()) {
                unsupported++;
                continue;
            }
            try {
                store.save(groupId, candidate, pieces, embeddings.embed(pieces));
                added++;
            } catch (RuntimeException exception) {
                log.warn("자료 {} 색인 실패: {}", candidate.resourceId(), exception.getClass().getSimpleName());
                failures.add(candidate.title());
            }
        }
        return new IndexResponse(added, skipped, removed, unsupported, failures);
    }
}
