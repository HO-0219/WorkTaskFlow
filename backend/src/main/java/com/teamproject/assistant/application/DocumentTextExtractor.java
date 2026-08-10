package com.teamproject.assistant.application;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * 자료 파일에서 색인할 본문을 뽑는다.
 *
 * <p>1차 범위는 txt 와 csv 다. 나머지 허용 확장자(pdf·docx·xlsx·pptx)는 새 파싱 의존성이
 * 필요해서 색인 결과에 unsupported 로만 집계한다.
 */
@Component
public class DocumentTextExtractor {
    private static final Set<String> SUPPORTED = Set.of("txt", "csv");
    private static final char BOM = '﻿';

    public boolean supports(String filename) {
        return SUPPORTED.contains(extension(filename));
    }

    public String extract(byte[] content, String filename) {
        return switch (extension(filename)) {
            case "txt" -> decode(content);
            case "csv" -> fromCsv(content);
            default -> "";
        };
    }

    private String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    /** 한글 자료는 CP949 로 저장된 것이 흔하다. UTF-8 로 깨지면 다음 후보로 넘어간다. */
    private String decode(byte[] content) {
        for (Charset charset : List.of(StandardCharsets.UTF_8, Charset.forName("x-windows-949"))) {
            try {
                return stripBom(charset.newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT)
                        .decode(ByteBuffer.wrap(content))
                        .toString());
            } catch (CharacterCodingException ignored) {
                // 다음 인코딩 후보로 넘어간다.
            }
        }
        return stripBom(new String(content, StandardCharsets.UTF_8));
    }

    /** 엑셀이 내보낸 UTF-8 파일은 앞에 BOM(U+FEFF)을 붙이는 것이 흔하다. 첫 필드를 오염시키므로 걷어낸다. */
    private String stripBom(String value) {
        return !value.isEmpty() && value.charAt(0) == BOM ? value.substring(1) : value;
    }

    /** 행을 "열이름: 값" 으로 편다. 헤더만 반복되는 청크가 검색을 망치지 않게 한다. */
    private String fromCsv(byte[] content) {
        List<List<String>> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new StringReader(decode(content)))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) rows.add(cells(line));
            }
        } catch (IOException exception) {
            throw new IllegalStateException("csv 본문을 읽지 못했습니다.", exception);
        }
        if (rows.isEmpty()) return "";
        List<String> header = rows.get(0);
        if (rows.size() == 1) return String.join(", ", header);
        List<String> lines = new ArrayList<>();
        for (List<String> row : rows.subList(1, rows.size())) {
            List<String> pairs = new ArrayList<>();
            for (int index = 0; index < row.size(); index++) {
                if (row.get(index).isEmpty()) continue;
                String key = index < header.size() ? header.get(index) : "열" + (index + 1);
                pairs.add(key + ": " + row.get(index));
            }
            if (!pairs.isEmpty()) lines.add(String.join(", ", pairs));
        }
        return String.join("\n", lines);
    }

    /** 큰따옴표로 감싼 값과 그 안의 쉼표만 다루는 최소 CSV 분해다. */
    private List<String> cells(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        values.add(current.toString().trim());
        return values;
    }
}
