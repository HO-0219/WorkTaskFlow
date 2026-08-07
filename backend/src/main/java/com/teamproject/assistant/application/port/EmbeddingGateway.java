package com.teamproject.assistant.application.port;

import java.util.List;

public interface EmbeddingGateway {
    /** 입력 순서 그대로 임베딩을 돌려준다. */
    List<float[]> embed(List<String> texts);
}
