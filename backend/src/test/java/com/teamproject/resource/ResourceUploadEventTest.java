package com.teamproject.resource;

import com.teamproject.TeamProjectApplication;
import com.teamproject.group.domain.Group;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupMemberRepository;
import com.teamproject.group.domain.GroupRepository;
import com.teamproject.resource.application.ResourceService;
import com.teamproject.resource.application.ResourceUploadedEvent;
import com.teamproject.task.domain.Task;
import com.teamproject.task.domain.TaskRepository;
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
 * 리스너는 AFTER_COMMIT 이라 롤백하는 테스트 트랜잭션에서는 안 불린다. 여기서는 발행 자체(대상·범위)만
 * {@link ApplicationEvents} 로 확인하고, 실제 색인 로직은 AiDocumentIndexService.indexResource() 를
 * 직접 부르는 AiDocumentRagTest 쪽에서 검증한다.
 */
@SpringBootTest(classes = TeamProjectApplication.class,
        properties = "app.storage.local-root=target/test-uploads")
@RecordApplicationEvents
@Transactional
class ResourceUploadEventTest {
    @Autowired ResourceService resources;
    @Autowired UserRepository users;
    @Autowired GroupRepository groups;
    @Autowired GroupMemberRepository members;
    @Autowired TaskRepository tasks;
    @Autowired ApplicationEvents events;

    @Test
    void publishesAnUploadEventForAGroupLevelResource() {
        Fixture fixture = fixture();

        var uploaded = upload(fixture, null);

        assertThat(events.stream(ResourceUploadedEvent.class))
                .containsExactly(new ResourceUploadedEvent(fixture.groupId(), uploaded.id()));
    }

    @Test
    void doesNotPublishForATaskAttachedResource() {
        Fixture fixture = fixture();
        Task task = tasks.save(new Task(groups.findById(fixture.groupId()).orElseThrow(),
                members.findByGroupIdAndUserId(fixture.groupId(), fixture.userId()).orElseThrow(),
                "업무", null, Task.Priority.NORMAL, null));

        upload(fixture, task.getId());

        assertThat(events.stream(ResourceUploadedEvent.class)).isEmpty();
    }

    private com.teamproject.resource.application.dto.ResourceDtos.ResourceResponse upload(Fixture fixture, Long taskId) {
        return resources.upload(fixture.userId(), fixture.groupId(), taskId, "배포 절차서",
                new MockMultipartFile("file", "배포.txt", "text/plain",
                        "금요일에는 배포하지 않는다.".getBytes(StandardCharsets.UTF_8)));
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        User user = users.save(new User("res_" + suffix, "res_" + suffix + "@example.com",
                "hash", "자료 사용자", true));
        Group group = groups.save(Group.team("자료 테스트 그룹", null, "Asia/Seoul", user));
        members.save(GroupMember.leader(group, user));
        return new Fixture(user.getId(), group.getId());
    }

    private record Fixture(Long userId, Long groupId) {}
}
