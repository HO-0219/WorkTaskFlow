package com.teamproject.group.presentation;

import com.teamproject.group.application.GroupService;
import com.teamproject.group.application.GroupInvitationService;
import com.teamproject.group.application.GroupMemberService;
import com.teamproject.group.application.dto.GroupDtos.CreateGroupRequest;
import com.teamproject.group.application.dto.GroupDtos.GroupResponse;
import com.teamproject.group.application.dto.GroupDtos.UpdateGroupRequest;
import com.teamproject.group.application.dto.GroupDtos.CreateInvitationRequest;
import com.teamproject.group.application.dto.GroupDtos.InvitationResponse;
import com.teamproject.group.application.dto.GroupDtos.MemberResponse;
import com.teamproject.group.application.dto.GroupDtos.ChangeMemberRoleRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {
    private final GroupService groups;
    private final GroupInvitationService invitations;
    private final GroupMemberService members;

    public GroupController(GroupService groups, GroupInvitationService invitations, GroupMemberService members) {
        this.groups = groups;
        this.invitations = invitations;
        this.members = members;
    }

    @GetMapping
    List<GroupResponse> list(Authentication authentication) {
        return groups.list((Long) authentication.getPrincipal());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    GroupResponse create(Authentication authentication, @Valid @RequestBody CreateGroupRequest request) {
        return groups.createTeam((Long) authentication.getPrincipal(), request);
    }

    @GetMapping("/{groupId}")
    GroupResponse get(Authentication authentication, @PathVariable Long groupId) {
        return groups.get((Long) authentication.getPrincipal(), groupId);
    }

    @PatchMapping("/{groupId}")
    GroupResponse update(Authentication authentication, @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupRequest request) {
        return groups.update((Long) authentication.getPrincipal(), groupId, request);
    }

    @GetMapping("/{groupId}/members")
    List<MemberResponse> members(Authentication authentication, @PathVariable Long groupId) {
        return invitations.members((Long) authentication.getPrincipal(), groupId);
    }

    @PostMapping("/{groupId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse invite(Authentication authentication, @PathVariable Long groupId,
            @Valid @RequestBody CreateInvitationRequest request) {
        return invitations.invite((Long) authentication.getPrincipal(), groupId, request.email());
    }

    @GetMapping("/{groupId}/invitations")
    List<InvitationResponse> invitations(Authentication authentication, @PathVariable Long groupId) {
        return invitations.list((Long) authentication.getPrincipal(), groupId);
    }

    @DeleteMapping("/{groupId}/invitations/{invitationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void cancel(Authentication authentication, @PathVariable Long groupId, @PathVariable Long invitationId) {
        invitations.cancel((Long) authentication.getPrincipal(), groupId, invitationId);
    }

    @PatchMapping("/{groupId}/members/{memberId}/role")
    MemberResponse changeRole(Authentication authentication, @PathVariable Long groupId,
            @PathVariable Long memberId, @Valid @RequestBody ChangeMemberRoleRequest request) {
        return members.changeRole((Long) authentication.getPrincipal(), groupId, memberId, request.role());
    }

    @DeleteMapping("/{groupId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(Authentication authentication, @PathVariable Long groupId, @PathVariable Long memberId) {
        members.remove((Long) authentication.getPrincipal(), groupId, memberId);
    }

    @DeleteMapping("/{groupId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void leave(Authentication authentication, @PathVariable Long groupId) {
        members.leave((Long) authentication.getPrincipal(), groupId);
    }
}
