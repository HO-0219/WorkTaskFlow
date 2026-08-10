package com.teamproject.resource.application;

/** 그룹 자료실(업무에 딸리지 않은 자료)에 새 파일이 올라왔을 때만 발행한다. */
public record ResourceUploadedEvent(Long groupId, Long resourceId) {}
