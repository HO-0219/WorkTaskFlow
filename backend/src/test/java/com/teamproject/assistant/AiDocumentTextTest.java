package com.teamproject.assistant;

import com.teamproject.assistant.application.DocumentTextExtractor;
import com.teamproject.assistant.application.TextChunker;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiDocumentTextTest {
    private final DocumentTextExtractor extractor = new DocumentTextExtractor();
    private final TextChunker chunker = new TextChunker();

    @Test
    void readsBothUtf8AndCp949Text() {
        String text = "금요일 배포는 금지한다.";

        assertThat(extractor.extract(text.getBytes(StandardCharsets.UTF_8), "규정.txt")).isEqualTo(text);
        assertThat(extractor.extract(text.getBytes(Charset.forName("x-windows-949")), "규정.txt"))
                .isEqualTo(text);
    }

    @Test
    void flattensCsvRowsSoHeadersDoNotDominateAChunk() {
        byte[] csv = """
                월,처리건수,지연건수
                2026-06,120,14
                2026-07,98,5
                """.getBytes(StandardCharsets.UTF_8);

        assertThat(extractor.extract(csv, "통계.csv"))
                .isEqualTo("월: 2026-06, 처리건수: 120, 지연건수: 14\n월: 2026-07, 처리건수: 98, 지연건수: 5");
    }

    @Test
    void reportsOnlyTheFormatsItCanActuallyRead() {
        assertThat(extractor.supports("회의록.txt")).isTrue();
        assertThat(extractor.supports("통계.csv")).isTrue();
        assertThat(extractor.supports("설계.pdf")).isFalse();
        assertThat(extractor.supports("사진.png")).isFalse();
        assertThat(extractor.supports(null)).isFalse();
    }

    @Test
    void keepsChunksWithinTheSizeLimitAndOverlapsThem() {
        String paragraph = "가".repeat(400);
        String text = String.join("\n\n", paragraph, paragraph, paragraph, paragraph);

        List<String> chunks = chunker.split(text);

        assertThat(chunks).hasSizeGreaterThan(1);
        assertThat(chunks).allSatisfy(chunk -> assertThat(chunk.length()).isLessThanOrEqualTo(900));
        // 겹침이 있으므로 조각 길이의 합은 원문보다 길다.
        assertThat(chunks.stream().mapToInt(String::length).sum()).isGreaterThan(text.length());
    }

    @Test
    void splitsASingleOversizedParagraphInsteadOfDroppingIt() {
        List<String> chunks = chunker.split("나".repeat(2500));

        assertThat(chunks).hasSizeGreaterThan(2);
        assertThat(chunks).allSatisfy(chunk -> assertThat(chunk.length()).isLessThanOrEqualTo(900));
    }

    @Test
    void returnsNothingForEmptyContent() {
        assertThat(chunker.split("   \n\n ")).isEmpty();
        assertThat(chunker.split(null)).isEmpty();
    }
}
