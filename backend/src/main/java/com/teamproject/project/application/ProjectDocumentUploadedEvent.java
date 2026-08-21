package com.teamproject.project.application;

/** 프로젝트 파일함에 새 파일이 올라왔을 때만 발행한다(링크 등록은 본문이 없어 대상이 아니다). */
public record ProjectDocumentUploadedEvent(Long groupId, Long documentId) {}
