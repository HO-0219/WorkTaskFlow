package com.teamproject.project;

import com.teamproject.TeamProjectApplication;
import com.teamproject.group.domain.Group;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupMemberRepository;
import com.teamproject.group.domain.GroupRepository;
import com.teamproject.project.application.ProjectDocumentService;
import com.teamproject.project.application.ProjectDocumentUploadedEvent;
import com.teamproject.project.domain.Project;
import com.teamproject.project.domain.ProjectRepository;
import com.teamproject.user.domain.User;
import com.teamproject.user.domain.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 자동 색인은 이 이벤트 발행에 물려 있다({@link com.teamproject.assistant.application.AiDocumentAutoIndexListener}).
 * 그룹 자료실의 {@link com.teamproject.resource.ResourceUploadEventTest}와 같은 패턴 — 발행
 * 자체만 확인하고, 실제 색인은 AiDocumentProjectDocumentRagTest 쪽에서 검증한다.
 */
@SpringBootTest(classes = TeamProjectApplication.class,
        properties = "app.storage.local-root=target/test-uploads")
@RecordApplicationEvents
@Transactional
class ProjectDocumentUploadEventTest {
    @Autowired ProjectDocumentService documents;
    @Autowired ProjectRepository projects;
    @Autowired UserRepository users;
    @Autowired GroupRepository groups;
    @Autowired GroupMemberRepository members;
    @Autowired ApplicationEvents events;

    @Test
    void publishesAnUploadEventForAProjectFile() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        User user = users.save(new User("pd_" + suffix, "pd_" + suffix + "@example.com",
                "hash", "파일 사용자", true));
        Group group = groups.save(Group.team("파일 테스트 그룹", null, "Asia/Seoul", user));
        GroupMember leader = members.save(GroupMember.leader(group, user));
        Project project = projects.save(new Project(group, leader, leader, "파일 테스트 프로젝트", null, null, null));

        var uploaded = documents.upload(user.getId(), project.getId(), null, "배포 절차서",
                new MockMultipartFile("file", "배포.txt", "text/plain",
                        "금요일에는 배포하지 않는다.".getBytes(StandardCharsets.UTF_8)));

        assertThat(events.stream(ProjectDocumentUploadedEvent.class))
                .containsExactly(new ProjectDocumentUploadedEvent(group.getId(), uploaded.id()));
    }
}
