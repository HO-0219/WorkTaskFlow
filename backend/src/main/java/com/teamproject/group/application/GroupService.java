package com.teamproject.group.application;

import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.application.dto.GroupDtos.CreateGroupRequest;
import com.teamproject.group.application.dto.GroupDtos.GroupResponse;
import com.teamproject.group.application.dto.GroupDtos.UpdateGroupRequest;
import com.teamproject.group.domain.Group;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupMemberRepository;
import com.teamproject.group.domain.GroupRepository;
import com.teamproject.user.domain.User;
import com.teamproject.user.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.List;

@Service
public class GroupService {
    private final UserRepository users;
    private final GroupRepository groups;
    private final GroupMemberRepository members;
    private final GroupAuthorization authorization;

    public GroupService(UserRepository users, GroupRepository groups, GroupMemberRepository members,
            GroupAuthorization authorization) {
        this.users = users;
        this.groups = groups;
        this.members = members;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> list(Long userId) {
        return members.findAllByUserIdAndStatusOrderByGroupTypeAscGroupNameAsc(userId, GroupMember.Status.ACTIVE)
                .stream().map(this::response).toList();
    }

    @Transactional
    public GroupResponse createTeam(Long userId, CreateGroupRequest request) {
        User creator = users.findById(userId).orElseThrow(() ->
                new ApplicationException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        String timezone = normalizeTimezone(request.timezone());
        String description = request.description() == null || request.description().isBlank()
                ? null : request.description().trim();
        Group group = groups.save(Group.team(request.name().trim(), description, timezone, creator));
        return response(members.save(GroupMember.leader(group, creator)));
    }

    @Transactional(readOnly = true)
    public GroupResponse get(Long userId, Long groupId) {
        return response(authorization.requireActiveMember(groupId, userId));
    }

    @Transactional
    public GroupResponse update(Long userId, Long groupId, UpdateGroupRequest request) {
        GroupMember member = authorization.requireLeader(groupId, userId);
        Group group = member.getGroup();
        String name = request.name() == null ? group.getName() : requireName(request.name());
        String description = request.description() == null
                ? group.getDescription() : blankToNull(request.description());
        String timezone = request.timezone() == null
                ? group.getTimezone() : normalizeTimezone(request.timezone());
        Group.DashboardVisibility visibility = request.dashboardVisibility() == null
                ? group.getDashboardVisibility() : visibility(request.dashboardVisibility());
        if (group.getType() == Group.Type.PERSONAL && visibility != Group.DashboardVisibility.MEMBERS) {
            throw new ApplicationException("PERSONAL_GROUP_RESTRICTED", HttpStatus.BAD_REQUEST,
                    "개인 그룹의 공개 범위는 변경할 수 없습니다.");
        }
        group.updateSettings(name, description, timezone, visibility);
        return response(member);
    }

    private String normalizeTimezone(String value) {
        String timezone = value == null || value.isBlank() ? "Asia/Seoul" : value.trim();
        try {
            ZoneId.of(timezone);
            return timezone;
        } catch (DateTimeException exception) {
            throw new ApplicationException("TIMEZONE_INVALID", HttpStatus.BAD_REQUEST,
                    "올바른 timezone을 입력해 주세요.");
        }
    }

    private String requireName(String value) {
        if (value.isBlank()) {
            throw new ApplicationException("GROUP_NAME_REQUIRED", HttpStatus.BAD_REQUEST,
                    "그룹 이름을 입력해 주세요.");
        }
        return value.trim();
    }

    private String blankToNull(String value) { return value.isBlank() ? null : value.trim(); }

    private Group.DashboardVisibility visibility(String value) {
        try {
            return Group.DashboardVisibility.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ApplicationException("DASHBOARD_VISIBILITY_INVALID", HttpStatus.BAD_REQUEST,
                    "올바른 대시보드 공개 범위를 입력해 주세요.");
        }
    }

    private GroupResponse response(GroupMember member) {
        Group group = member.getGroup();
        return new GroupResponse(group.getId(), group.getType().name(), group.getName(), group.getDescription(),
                group.getTimezone(), group.getDashboardVisibility().name(), member.getId(),
                member.getRole().name(), group.getCreatedAt(), group.getUpdatedAt());
    }
}
