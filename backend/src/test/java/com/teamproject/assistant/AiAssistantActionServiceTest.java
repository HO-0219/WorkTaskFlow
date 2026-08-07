package com.teamproject.assistant;

import com.teamproject.TeamProjectApplication;
import com.teamproject.assistant.application.AiAssistantActionService;
import com.teamproject.assistant.domain.AiAssistantAction;
import com.teamproject.assistant.domain.AiAssistantActionRepository;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.domain.Group;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupMemberRepository;
import com.teamproject.group.domain.GroupRepository;
import com.teamproject.task.domain.TaskRepository;
import com.teamproject.user.domain.User;
import com.teamproject.user.domain.UserRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = TeamProjectApplication.class)
@Transactional
class AiAssistantActionServiceTest {
    @Autowired AiAssistantActionService service;
    @Autowired AiAssistantActionRepository actions;
    @Autowired UserRepository users;
    @Autowired GroupRepository groups;
    @Autowired GroupMemberRepository members;
    @Autowired TaskRepository tasks;

    @Test
    void confirmedTaskCreationExecutesOnlyOnce() {
        Fixture fixture = fixture(true);
        AiAssistantAction action = actions.save(new AiAssistantAction(fixture.user(), fixture.group(),
                "create_task", """
                        {"title":"AI가 만든 업무","description":null,"priority":"HIGH",
                         "dueAt":null,"checklistItems":["테스트","모니터링"]}
                        """, "업무 생성: AI가 만든 업무", LocalDateTime.now().plusMinutes(10)));

        var first = service.confirm(fixture.user().getId(), action.getId());
        var second = service.confirm(fixture.user().getId(), action.getId());

        assertThat(first.status()).isEqualTo("COMPLETED");
        assertThat(first.targetUrl()).startsWith("/tasks/");
        assertThat(second.message()).isEqualTo("이미 실행한 작업입니다.");
        assertThat(tasks.findAllByGroupIdOrderByCreatedAtDesc(fixture.group().getId()))
                .extracting("title").containsExactly("AI가 만든 업무");
    }

    @Test
    void inviteLinkStillRequiresLeaderAtConfirmationTime() {
        Fixture fixture = fixture(false);
        AiAssistantAction action = actions.save(new AiAssistantAction(fixture.user(), fixture.group(),
                "create_group_invite_link", "{}", "새 그룹 초대 링크 생성",
                LocalDateTime.now().plusMinutes(10)));

        assertThatThrownBy(() -> service.confirm(fixture.user().getId(), action.getId()))
                .isInstanceOf(ApplicationException.class)
                .extracting("code").isEqualTo("GROUP_LEADER_REQUIRED");
    }

    private Fixture fixture(boolean leader) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        User user = users.save(new User("assistant_" + suffix,
                "assistant_" + suffix + "@example.com", "hash", "AI 사용자", true));
        Group group = groups.save(Group.team("AI 테스트 그룹", null, "Asia/Seoul", user));
        members.save(leader ? GroupMember.leader(group, user) : GroupMember.member(group, user));
        return new Fixture(user, group);
    }

    private record Fixture(User user, Group group) {}
}
