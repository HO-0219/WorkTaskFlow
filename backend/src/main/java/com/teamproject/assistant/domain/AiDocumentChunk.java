package com.teamproject.assistant.domain;

import com.teamproject.group.domain.Group;
import com.teamproject.resource.domain.GroupResource;
import jakarta.persistence.*;
import java.nio.ByteBuffer;
import java.time.LocalDateTime;

/**
 * 그룹 자료 본문의 한 조각과 그 임베딩.
 *
 * <p>임베딩은 float 배열을 big-endian 으로 편 BLOB 이다. MySQL 8.4 에는 VECTOR 타입이 없고
 * 코퍼스 규모가 작아(그룹당 수십 청크) 검색은 그룹 단위로 전부 읽어 메모리에서 코사인을 잰다.
 */
@Entity
@Table(name = "ai_document_chunks")
public class AiDocumentChunk {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "group_id") private Group group;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "resource_id")
    private GroupResource resource;
    @Column(name = "chunk_index", nullable = false) private int chunkIndex;
    @Column(nullable = false, length = 120) private String title;
    @Column(length = 255) private String filename;
    // @Lob 만 붙이면 Hibernate 가 tinytext/tinyblob 을 기대해 마이그레이션과 어긋난다(validate 실패).
    @Column(nullable = false, columnDefinition = "text") private String content;
    @Column(nullable = false, columnDefinition = "longblob") private byte[] embedding;
    @Column(nullable = false) private int dimensions;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt;

    protected AiDocumentChunk() {}

    public AiDocumentChunk(Group group, GroupResource resource, int chunkIndex, String title,
            String filename, String content, float[] embedding) {
        this.group = group;
        this.resource = resource;
        this.chunkIndex = chunkIndex;
        this.title = title;
        this.filename = filename;
        this.content = content;
        this.embedding = pack(embedding);
        this.dimensions = embedding.length;
        this.createdAt = LocalDateTime.now();
    }

    public float[] vector() {
        ByteBuffer buffer = ByteBuffer.wrap(embedding);
        float[] values = new float[dimensions];
        for (int index = 0; index < dimensions; index++) values[index] = buffer.getFloat();
        return values;
    }

    private static byte[] pack(float[] values) {
        ByteBuffer buffer = ByteBuffer.allocate(values.length * Float.BYTES);
        for (float value : values) buffer.putFloat(value);
        return buffer.array();
    }

    public Long getId() { return id; }
    public int getChunkIndex() { return chunkIndex; }
    public String getTitle() { return title; }
    public String getFilename() { return filename; }
    public String getContent() { return content; }
    public int getDimensions() { return dimensions; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
